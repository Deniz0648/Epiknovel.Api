using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Modules.Wallet.Services;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Wallet.Controllers;

[ApiController]
[Route("api/wallet/orders")]
public class WalletCallbackController(
    WalletDbContext dbContext, 
    IIyzicoService iyzicoService, 
    IMediator mediator,
    Epiknovel.Shared.Core.Interfaces.IDiscordAlertService discordAlertService) : ControllerBase
{
    [HttpPost("callback")]
    [Consumes("application/x-www-form-urlencoded")]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Callback([FromForm] string token)
    {
        if (string.IsNullOrEmpty(token))
        {
            return BadRequest("Token bulunamadı.");
        }

        var strategy = dbContext.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            var iyzicoResult = await iyzicoService.RetrieveCheckoutFormResultAsync(token);

            if (iyzicoResult.Status != "success" || iyzicoResult.PaymentStatus != "SUCCESS")
            {
                var errorMessage = iyzicoResult.ErrorMessage ?? "Ödeme işlemi başarısız.";
                return BadRequest($"Hata: {errorMessage}");
            }

            if (!Guid.TryParse(iyzicoResult.BasketId, out var orderId))
            {
                return BadRequest("Geçersiz sepet numarası.");
            }

            var order = await dbContext.CoinPurchaseOrders
                .Include(o => o.Package)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null)
            {
                return NotFound("Sipariş sistemde bulunamadı.");
            }

            if (!decimal.TryParse(iyzicoResult.PaidPrice, out var paidPrice) ||
                Math.Abs(order.PricePaid - paidPrice) > 0.01m)
            {
                return BadRequest("Ödenen tutar sipariş tutarıyla eşleşmiyor.");
            }

            if (order.Status == OrderStatus.Paid || order.Status == OrderStatus.Refunded || order.Status == OrderStatus.AwaitingRefund)
            {
                return Ok("Bu siparişin durumu zaten sonuçlanmış.");
            }

            if (order.CreatedAt.AddHours(12) < DateTime.UtcNow)
            {
                order.Status = OrderStatus.Failed;
                await dbContext.SaveChangesAsync();
                return BadRequest("Sipariş süresi dolmuş.");
            }

            using var transaction = await dbContext.Database.BeginTransactionAsync();

            try
            {
                order.Status = OrderStatus.Paid;
                order.PaidAt = DateTime.UtcNow;
                order.IyzicoPaymentId = iyzicoResult.PaymentId;

                var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == order.UserId);
                if (wallet == null)
                {
                    wallet = new Domain.Wallet
                    {
                        UserId = order.UserId,
                        CoinBalance = (int)order.CoinAmount,
                        Version = 1
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
                    Description = "Iyzico ile Coin Paketi Satın Alma",
                    ReferenceId = order.Id
                };

                dbContext.WalletTransactions.Add(walletLog);
                await dbContext.SaveChangesAsync();
                await transaction.CommitAsync();

                await mediator.Publish(new Epiknovel.Shared.Core.Events.OrderPaidEvent(
                    order.UserId,
                    order.Id,
                    order.PricePaid,
                    (int)order.CoinAmount,
                    order.Package?.Name ?? "Coin Paketi",
                    "TL",
                    order.PaidAt ?? DateTime.UtcNow
                ));
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                // 🛡️ RACE CONDITION KORUMASI: Başka bir request bunu zaten işlemiş.
                return Ok("Bu sipariş eşzamanlı olarak işlenmektedir.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                
                // 🛡️ SAFE REFUND: Cüzdan çöktüyse iade denenir. İade de çökerse AwaitingRefund işaretlenir.
                var transactionId = iyzicoResult.PaymentItems?.FirstOrDefault()?.PaymentTransactionId;
                if (!string.IsNullOrEmpty(transactionId))
                {
                    try 
                    {
                        await iyzicoService.RefundAsync(transactionId, paidPrice, iyzicoResult.ConversationId, HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1");
                        order.Status = OrderStatus.Refunded;
                    } 
                    catch (Exception refundEx)
                    { 
                        // Iyzico da çöktüyse arka plan işçisi denesin diye bırak
                        order.Status = OrderStatus.AwaitingRefund;
                        _ = discordAlertService.SendUrgentAlertAsync(
                            $"Sipariş No: `{order.Id}`\nIyzico Payment ID: `{iyzicoResult.PaymentId}`\nKullanıcı: `{order.UserId}`\n\nBu ödeme iade edilmek istendi ancak Iyzico servisine ulaşılamadı. Manuel kontrol gerekiyor.\n`{refundEx.Message}`", 
                            "Wallet Callback Revert");
                    }
                    
                    try 
                    {
                        dbContext.CoinPurchaseOrders.Update(order);
                        await dbContext.SaveChangesAsync();
                    } 
                    catch 
                    { 
                        // DB tamamen çöktüyse sipariş Pending kalır, Worker 15dk sonra her halükarda yakalar. 
                    }
                }

                return StatusCode(500, $"Ödeme onaylanırken hata oluştu: {ex.Message}");
            }

            return Ok("Ödeme başarıyla tamamlandı.");
        });
    }
}
