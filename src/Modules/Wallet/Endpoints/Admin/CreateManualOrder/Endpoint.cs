using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Constants;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.CreateManualOrder;

public record Request
{
    public Guid UserId { get; init; }
    public string BuyerEmail { get; init; } = string.Empty;
    public decimal PricePaid { get; init; }
    public decimal CoinAmount { get; init; }
    public string Description { get; init; } = "Manuel Fatura Girişi";
    public Guid? InvoiceDocumentId { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<Guid>>
{
    public override void Configure()
    {
        Post("/wallet/admin/orders/manual");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Manuel satın alma kaydı ve fatura oluştur (Admin).";
            s.Description = "Sistem dışı (havale/eft vb.) yapılan ödemeler için manuel sipariş kaydı oluşturur ve kullanıcıya coin yükler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var strategy = dbContext.Database.CreateExecutionStrategy();

        await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await dbContext.Database.BeginTransactionAsync(ct);
            try
            {
                // 2. Sipariş Oluştur
                var order = new CoinPurchaseOrder
                {
                    UserId = req.UserId,
                    BuyerEmail = req.BuyerEmail,
                    PricePaid = req.PricePaid,
                    CoinAmount = req.CoinAmount,
                    Status = OrderStatus.Paid,
                    PaidAt = DateTime.UtcNow,
                    InvoiceDocumentId = req.InvoiceDocumentId,
                    InvoiceFileUrl = req.InvoiceDocumentId.HasValue ? $"/api/compliance/documents/{req.InvoiceDocumentId}/download" : null,
                    IyzicoConversationId = "MANUAL",
                    IyzicoPaymentId = "MANUAL-" + Guid.NewGuid().ToString("N").Substring(0, 8)
                };
                dbContext.CoinPurchaseOrders.Add(order);

                // 3. Cüzdan Güncelle
                var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == req.UserId, ct);
                if (wallet == null)
                {
                    wallet = new Domain.Wallet
                    {
                        UserId = req.UserId,
                        CoinBalance = req.CoinAmount,
                        Version = 1
                    };
                    dbContext.Wallets.Add(wallet);
                }
                else
                {
                    wallet.CoinBalance += req.CoinAmount;
                }

                // 4. İşlem Kaydı (WalletTransaction)
                var walletLog = new WalletTransaction
                {
                    UserId = req.UserId,
                    Wallet = wallet,
                    CoinAmount = req.CoinAmount,
                    FiatAmount = req.PricePaid,
                    AppliedCoinPrice = req.CoinAmount > 0 ? req.PricePaid / req.CoinAmount : 0,
                    Type = TransactionType.Purchase,
                    Description = req.Description,
                    ReferenceId = order.Id
                };
                dbContext.WalletTransactions.Add(walletLog);

                await dbContext.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await Send.ResponseAsync(Result<Guid>.Success(order.Id), 200, ct);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(ct);
                await Send.ResponseAsync(Result<Guid>.Failure($"İşlem sırasında hata oluştu: {ex.Message}"), 500, ct);
            }
        });
    }
}
