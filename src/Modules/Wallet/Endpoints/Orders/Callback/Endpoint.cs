using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Modules.Wallet.Services;
using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.Mvc;

namespace Epiknovel.Modules.Wallet.Endpoints.Orders.Callback;

public record Request
{
    [FastEndpoints.FromForm]
    public string token { get; init; } = string.Empty;
}

public class Endpoint(WalletDbContext dbContext, IIyzicoService iyzicoService) : Endpoint<Request, string>
{
    public override void Configure()
    {
        Post("/wallet/orders/callback");
        AllowAnonymous(); // Iyzico Webhook/Callback için anonim olmalı
        Summary(s => {
            s.Summary = "Iyzico ödeme bildirimini (callback) işle.";
            s.Description = "Sistem tarafından başlatılan ödemenin başarı durumunu doğrulayarak işlemi tamamlar ve kullanıcının cüzdanına coini yükler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var strategy = dbContext.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            // Token üzerinden sonucu sorgula. Bu güvenli sorgu Iyzico sunucularına yapılır.
            var iyzicoResult = await iyzicoService.RetrieveCheckoutFormResultAsync(req.token, ct);

            if (iyzicoResult.Status != "success" || iyzicoResult.PaymentStatus != "SUCCESS")
            {
                // Ödeme Başarısız veya Iyzico API Hatası
                var errorMessage = iyzicoResult.ErrorMessage ?? "Ödeme işlemi başarısız.";
                await Send.StringAsync($"Hata: {errorMessage}", 400, cancellation: ct);
                return;
            }

            // 1. Siparişi BasketId üzerinden bul (Initializing aşamasında biz set etmiştik)
            if (!Guid.TryParse(iyzicoResult.BasketId, out var orderId))
            {
                await Send.StringAsync("Geçersiz sepet numarası.", 400, cancellation: ct);
                return;
            }

            var order = await dbContext.CoinPurchaseOrders
                .FirstOrDefaultAsync(o => o.Id == orderId, ct);

            if (order == null)
            {
                await Send.StringAsync("Sipariş sistemde bulunamadı.", 404, cancellation: ct);
                return;
            }

            // 2. Fiyat Manipülasyon Kontrolü (Bizim DB'mizdeki tutarla Iyzico'nun aldığı tutar aynı mı?)
            // Iyzico tutarları nokta ile ayırır (Örn: "15.00")
            if (!decimal.TryParse(iyzicoResult.PaidPrice, out var paidPrice) ||
                Math.Abs(order.PricePaid - paidPrice) > 0.01m)
            {
                // Burada bir dolandırıcılık teşebbüsü veya ciddi senkronizasyon hatası olabilir.
                await Send.StringAsync("Ödenen tutar sipariş tutarıyla eşleşmiyor (Fiyat Manipülasyon Riski).", 400, cancellation: ct);
                return;
            }

            if (order.Status == OrderStatus.Paid)
            {
                await Send.StringAsync("Bu sipariş zaten daha önce onaylanmış.", 200, cancellation: ct);
                return;
            }

            // 3. Sipariş Süresi Kontrolü (12 Saat Eski Siparişler Geçersiz)
            if (order.CreatedAt.AddHours(12) < DateTime.UtcNow)
            {
                order.Status = OrderStatus.Failed; // Süre doldu
                await dbContext.SaveChangesAsync(ct);
                await Send.StringAsync("Sipariş süresi dolmuş. Lütfen yeni bir sepet oluşturun.", 400, cancellation: ct);
                return;
            }

            // Atomic Transaction (Sipariş Onayı + Coin Yükleme + Log)
            using var transaction = await dbContext.Database.BeginTransactionAsync(ct);

            try
            {
                order.Status = OrderStatus.Paid;
                order.PaidAt = DateTime.UtcNow;
                order.IyzicoPaymentId = iyzicoResult.PaymentId;

                var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == order.UserId, ct);
                if (wallet == null)
                {
                    wallet = new Domain.Wallet
                    {
                        UserId = order.UserId,
                        CoinBalance = order.CoinAmount,
                        Version = 1
                    };
                    dbContext.Wallets.Add(wallet);
                }
                else
                {
                    wallet.CoinBalance += order.CoinAmount;
                }

                var walletLog = new WalletTransaction
                {
                    UserId = order.UserId,
                    Wallet = wallet,
                    CoinAmount = order.CoinAmount,
                    FiatAmount = order.PricePaid, // Ödediği TL
                    AppliedCoinPrice = order.PricePaid / order.CoinAmount, // Oranlanmış kur
                    Type = TransactionType.Adjustment, // Yükleme 
                    Description = "Iyzico ile Coin Paketi Satın Alma",
                    ReferenceId = order.Id
                };

                dbContext.WalletTransactions.Add(walletLog);

                await dbContext.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            }
            catch (Exception)
            {
                await transaction.RollbackAsync(ct);
                // Logger.LogError(...) eklenebilir
                await Send.StringAsync("Ödeme onaylanırken teknik bir hata oluştu.", 500, cancellation: ct);
                return;
            }

            // Ödeme başarılı mesajı ve Redirect (Opsiyonel)
            await Send.StringAsync("Ödeme başarıyla tamamlandı. Coinleriniz hesabınıza yüklendi.", 200, cancellation: ct);
        });
    }
}
