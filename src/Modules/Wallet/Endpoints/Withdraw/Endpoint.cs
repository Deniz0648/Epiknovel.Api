using FastEndpoints;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Epiknovel.Modules.Wallet.Endpoints.Withdraw;

public record Request
{
    public decimal Amount { get; init; }
    public string IBAN { get; init; } = string.Empty;
    public string AccountHolderName { get; init; } = string.Empty;
}

public class Endpoint(WalletDbContext dbContext) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/wallet/withdraw");
        Policies("BOLA"); // Yazar yetkisi gerektiren politika
        Summary(s => {
            s.Summary = "Para çekme talebi oluştur (Yazar).";
            s.Description = "Yazarın telif bakiyesini (TL) banka hesabına nakit olarak çekmek için talep oluşturmasını sağlar. Bakiye anlık kontrol edilir ve talep anında düşülür.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        if (req.Amount < 100)
        {
            await Send.ResponseAsync(Result<string>.Failure("Minimum para çekme tutarı 100 TL'dir."), 400, ct);
            return;
        }

        // 🛡️ ACID Transaction: Bakiye düşürme ve Talep oluşturma atomik olmalı
        var executionStrategy = dbContext.Database.CreateExecutionStrategy();

        await executionStrategy.ExecuteAsync(async () =>
        {
            using var transaction = await dbContext.Database.BeginTransactionAsync(ct);

            try
            {
                // 1. Cüzdanı çek (RowVersion ile korumalı)
                var wallet = await dbContext.Wallets
                    .FirstOrDefaultAsync(w => w.UserId == userId, ct);

                if (wallet == null || wallet.RevenueBalance < req.Amount)
                {
                    await transaction.RollbackAsync(ct);
                    await Send.ResponseAsync(Result<string>.Failure("Yetersiz telif bakiyesi."), 400, ct);
                    return;
                }

                // 2. Bakiyeden düş (Kilitleme mantığı)
                wallet.RevenueBalance -= req.Amount;

                // 3. Talep kaydı oluştur
                var withdrawRequest = new WithdrawRequest
                {
                    UserId = userId,
                    Amount = req.Amount,
                    IBAN = req.IBAN.Replace(" ", "").ToUpper(),
                    AccountHolderName = req.AccountHolderName,
                    Status = WithdrawStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                };

                // 4. İşlem kaydı (Log)
                var walletLog = new WalletTransaction
                {
                    UserId = userId,
                    Wallet = wallet,
                    CoinAmount = 0, // Nakit işlem
                    FiatAmount = -req.Amount,
                    Type = TransactionType.Withdrawal,
                    ReferenceId = withdrawRequest.Id,
                    Description = $"{req.Amount} TL tutarında para çekme talebi oluşturuldu. (Beklemede)"
                };

                dbContext.WithdrawRequests.Add(withdrawRequest);
                dbContext.WalletTransactions.Add(walletLog);

                await dbContext.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);

                await Send.ResponseAsync(Result<string>.Success("Para çekme talebiniz başarıyla oluşturuldu. En geç 3 iş günü içinde değerlendirilecektir."), 201, ct);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync(ct);
                await Send.ResponseAsync(Result<string>.Failure("Eş zamanlı işlem hatası. Lütfen tekrar deneyin."), 400, ct);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(ct);
                await Send.ResponseAsync(Result<string>.Failure($"Talep işlenirken bir hata oluştu: {ex.Message}"), 500, ct);
            }
        });
    }
}
