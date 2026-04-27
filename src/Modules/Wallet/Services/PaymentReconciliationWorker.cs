using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Epiknovel.Modules.Wallet.Services;

public class PaymentReconciliationWorker(
    ILogger<PaymentReconciliationWorker> logger,
    IServiceProvider serviceProvider) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("💳 Payment Reconciliation Worker is starting.");

        // overlap koruması: Timer yerine while + Delay kullanıyoruz.
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingOrdersAsync(stoppingToken);
                await ProcessPendingRefundsAsync(stoppingToken); // İsteğe bağlı: AwaitingRefund'ları da tekrar deneriz.
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "💳 Payment Reconciliation Worker encountered an error.");
            }

            // Her 15 dakikada bir çalıştır.
            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }

        logger.LogInformation("💳 Payment Reconciliation Worker is stopping.");
    }

    private async Task ProcessPendingOrdersAsync(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<WalletDbContext>();
        var iyzicoService = scope.ServiceProvider.GetRequiredService<IIyzicoService>();
        var alertService = scope.ServiceProvider.GetRequiredService<IDiscordAlertService>();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        // 20 dakikadan eski ama hala Pending olanları kontrol et.
        var thresholdDate = DateTime.UtcNow.AddMinutes(-20);
        
        var stuckOrders = await dbContext.CoinPurchaseOrders
            .Include(o => o.Package)
            .Where(o => o.Status == OrderStatus.Pending && o.CreatedAt < thresholdDate)
            .OrderBy(o => o.CreatedAt)
            .Take(50) // Her döngüde çok fazla memory tüketmesin
            .ToListAsync(ct);

        if (!stuckOrders.Any()) return;

        logger.LogInformation("💳 Found {Count} pending orders to reconcile.", stuckOrders.Count);

        foreach (var order in stuckOrders)
        {
            if (string.IsNullOrEmpty(order.IyzicoToken))
            {
                // Token yoksa iyzico üzerinden sorgu yapamayız. Sistemsel bir kopuktuk demektir.
                order.Status = OrderStatus.Failed;
                continue;
            }

            try
            {
                // Iyzico üzerinden CheckoutForm sonucunu manuel sorguluyoruz.
                var iyzicoResult = await iyzicoService.RetrieveCheckoutFormResultAsync(order.IyzicoToken);

                // Eğer Iyzico'da da başarılı değilse veya PaymentStatus "SUCCESS" değilse, başarısız kabul et.
                if (iyzicoResult.Status != "success" || iyzicoResult.PaymentStatus != "SUCCESS")
                {
                    logger.LogInformation("Order {OrderId} is marked as Failed by Iyzico. Status: {Status}, Error: {Error}", order.Id, iyzicoResult.PaymentStatus, iyzicoResult.ErrorMessage);
                    order.Status = OrderStatus.Failed;
                    continue;
                }

                // EGER IYZICO "BAŞARILI" DİYORSA ANCAK BİZDE PENDING İSE: Para bizde ama jeton verilmemiş!
                if (!decimal.TryParse(iyzicoResult.PaidPrice, out var paidPrice) || Math.Abs(order.PricePaid - paidPrice) > 0.01m)
                {
                    logger.LogWarning("Order {OrderId} price mismatch during reconciliation.", order.Id);
                    order.Status = OrderStatus.Failed;
                    continue;
                }
                
                // Burada işlemleri manual olarak onaylarız.
                var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == order.UserId, ct);
                if (wallet == null)
                {
                    wallet = new Domain.Wallet
                    {
                        UserId = order.UserId,
                        CoinBalance = (int)order.CoinAmount,
                        Version = 1 // RowVersion
                    };
                    dbContext.Wallets.Add(wallet);
                }
                else
                {
                    wallet.CoinBalance += (int)order.CoinAmount;
                }

                var walletLog = new WalletTransaction
                {
                    UserId = order.UserId,
                    Wallet = wallet,
                    CoinAmount = order.CoinAmount,
                    FiatAmount = order.PricePaid,
                    Type = TransactionType.Adjustment,
                    Description = "Iyzico Jeton Satın Alma (Otomatik Kurtarma)",
                    ReferenceId = order.Id
                };

                dbContext.WalletTransactions.Add(walletLog);
                
                order.Status = OrderStatus.Paid;
                order.PaidAt = DateTime.UtcNow;
                order.IyzicoPaymentId = iyzicoResult.PaymentId;

                await mediator.Publish(new Epiknovel.Shared.Core.Events.OrderPaidEvent(
                    order.UserId,
                    order.Id,
                    order.PricePaid,
                    (int)order.CoinAmount,
                    order.Package?.Name ?? "Coin Paketi",
                    "TL",
                    order.PaidAt ?? DateTime.UtcNow
                ), ct);

                logger.LogInformation("💳 Order {OrderId} successfully RECOVERED and fulfilled.", order.Id);
                
                // Uyarı fırlat ki adminlerin haberi olsun "bir şeyler dropout oluyor"
                _ = alertService.SendUrgentAlertAsync(
                    $"Kayıp bir Iyzico ödemesi tespit edildi ve otomatik olarak başarıyla cüzdana yatırıldı.\nSipariş No: `{order.Id}`", "Payment Recovery");

            }
            catch (DbUpdateConcurrencyException)
            {
                // Bir şekilde aynı anda manuel bir tetikleme olduysa
                logger.LogWarning("Concurrency exception while recovering order {OrderId}", order.Id);
                // Context'i yenilemek için bu turda atla
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error while recovering order {OrderId}", order.Id);
            }
        }
        
        await dbContext.SaveChangesAsync(ct);
    }
    
    private async Task ProcessPendingRefundsAsync(CancellationToken ct)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<WalletDbContext>();
        var iyzicoService = scope.ServiceProvider.GetRequiredService<IIyzicoService>();
        var alertService = scope.ServiceProvider.GetRequiredService<IDiscordAlertService>();

        var pendingRefunds = await dbContext.CoinPurchaseOrders
            .Where(o => o.Status == OrderStatus.AwaitingRefund)
            .OrderBy(o => o.CreatedAt)
            .Take(20)
            .ToListAsync(ct);

        if (!pendingRefunds.Any()) return;

        foreach (var order in pendingRefunds)
        {
            if (string.IsNullOrEmpty(order.IyzicoPaymentId) && string.IsNullOrEmpty(order.IyzicoToken))
                continue;
                
            try 
            {
                // AwaitingRefund olanların CheckoutResult'ını tekrar çekiyoruz ki TransactionId bulalım
                var iyzicoResult = await iyzicoService.RetrieveCheckoutFormResultAsync(order.IyzicoToken);
                var transactionId = iyzicoResult.PaymentItems?.FirstOrDefault()?.PaymentTransactionId;

                if (!string.IsNullOrEmpty(transactionId))
                {
                    await iyzicoService.RefundAsync(transactionId, order.PricePaid, iyzicoResult.ConversationId, "127.0.0.1");
                    order.Status = OrderStatus.Refunded;
                    
                    logger.LogInformation("💳 Order {OrderId} successfully refunded via retry.", order.Id);
                    _ = alertService.SendUrgentAlertAsync($"Askıda kalan iade işlemi **başarıyla** tamamlandı.\nSipariş No: `{order.Id}`", "Payment Refund Retry");
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to retry refund for order {OrderId}", order.Id);
            }
        }

        await dbContext.SaveChangesAsync(ct);
    }
}
