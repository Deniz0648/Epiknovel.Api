using FastEndpoints;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.ProcessWithdrawal;

public record Request
{
    public Guid Id { get; init; }
    public WithdrawStatus Status { get; init; }
    public string? ReceiptDocumentId { get; init; } // Onay (Approved) için zorunlu
    public string? Note { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<bool>>
{
    public override void Configure()
    {
        Post("/wallet/admin/withdrawals/{Id}/process");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Para çekme talebini onayla (Dekont ile) veya reddet (Admin).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        if (req.Status == WithdrawStatus.Approved && string.IsNullOrWhiteSpace(req.ReceiptDocumentId))
        {
            await Send.ResponseAsync(Result<bool>.Failure("Onaylama işlemi için dekont belgesi yüklenmelidir."), 400, ct);
            return;
        }
        var withdrawal = await dbContext.WithdrawRequests.FirstOrDefaultAsync(x => x.Id == req.Id, ct);

        if (withdrawal == null)
        {
            await Send.ResponseAsync(Result<bool>.Failure("Talep bulunamadı."), 404, ct);
            return;
        }

        if (withdrawal.Status != WithdrawStatus.Pending)
        {
            await Send.ResponseAsync(Result<bool>.Failure("Bu talep zaten işlenmiş."), 400, ct);
            return;
        }

        var executionStrategy = dbContext.Database.CreateExecutionStrategy();

        await executionStrategy.ExecuteAsync(async () =>
        {
            using var transaction = await dbContext.Database.BeginTransactionAsync(ct);

            try
            {
                withdrawal.Status = req.Status;
                withdrawal.AdminNote = req.Note;
                withdrawal.ProcessedAt = DateTime.UtcNow;
                withdrawal.ReceiptDocumentId = req.ReceiptDocumentId;

                // ❌ REDDEDİLDİYSE: PARAYI İADE ET
                if (req.Status == WithdrawStatus.Rejected)
                {
                    var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == withdrawal.UserId, ct);
                    if (wallet != null)
                    {
                        wallet.RevenueBalance += withdrawal.Amount;
                        
                        // İade transaction kaydı
                        var reversalTx = new WalletTransaction
                        {
                            UserId = withdrawal.UserId,
                            Wallet = wallet,
                            CoinAmount = 0,
                            FiatAmount = withdrawal.Amount,
                            Type = TransactionType.Adjustment,
                            ReferenceId = withdrawal.Id,
                            Description = $"Reddedilen para çekme talebi iadesi: {withdrawal.Amount} TL. (Not: {req.Note})"
                        };
                        dbContext.WalletTransactions.Add(reversalTx);
                    }
                }
                else if (req.Status == WithdrawStatus.Approved)
                {
                    // Onaylandığında sadece statü değişir, para zaten talep anında düşülmüştü.
                }

                await dbContext.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await Send.ResponseAsync(Result<bool>.Success(true), 200, ct);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(ct);
                await Send.ResponseAsync(Result<bool>.Failure($"İşlem başarısız: {ex.Message}"), 500, ct);
            }
        });
    }
}
