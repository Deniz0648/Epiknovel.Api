using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace Epiknovel.Modules.Wallet.Endpoints.Deposit;

public record Request
{
    public decimal Amount { get; init; }
}

public class Endpoint(WalletDbContext dbContext, IWebHostEnvironment env) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/wallet/deposit");
        Summary(s => {
            s.Summary = "Geliştirici ortamında bakiye yükle.";
            s.Description = "Sadece Development ortamında kullanıcı test hesabına sanal coin yüklenmesini sağlar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // Güvenlik: Sadece geliştirme ortamında çalışır. 
        if (!env.IsDevelopment())
        {
            await Send.ResponseAsync(Result<string>.Failure("Not Found"), 404, ct);
            return;
        }

        if (req.Amount <= 0)
        {
            ThrowError("Yükleme miktarı 0'dan büyük olmalıdır.");
            return;
        }

        var userIdString = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var wallet = await dbContext.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);

        if (wallet == null)
        {
            wallet = new Domain.Wallet
            {
                UserId = userId,
                CoinBalance = req.Amount,
                Version = 1
            };
            dbContext.Wallets.Add(wallet);
        }
        else
        {
            wallet.CoinBalance += req.Amount;
        }

        var transaction = new Domain.WalletTransaction
        {
            UserId = userId,
            Wallet = wallet,
            CoinAmount = req.Amount,
            Type = Domain.TransactionType.Adjustment,
            Description = "Demo Ortamı Bakiye Yüklemesi"
        };
        dbContext.WalletTransactions.Add(transaction);

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<string>.Success("Bakiye başarıyla yüklendi."), 200, ct);
    }
}
