using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Wallet.Endpoints.GetBalance;

public record Response
{
    public decimal CoinBalance { get; init; }
    public decimal RevenueBalance { get; init; }
}

public class Endpoint(WalletDbContext dbContext) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Get("/wallet/balance");
        // Varsayılan olarak authorize olacak (RequireAuthenticatedUser)
        Summary(s => {
            s.Summary = "Cüzdan bakiyesini getir.";
            s.Description = "Kullanıcının mevcut Coin bakiyesini ve eğer yazar ise elde ettiği cüzdandaki Net TL bakiyesini getirir.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        // Token'dan gelen User ID
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var wallet = await dbContext.Wallets
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.UserId == userId, ct);

        if (wallet == null)
        {
            // Cüzdan henüz oluşmamışsa, 0 bakiye dön (hata verme)
            await Send.ResponseAsync(Result<Response>.Success(new Response
            {
                CoinBalance = 0,
                RevenueBalance = 0
            }), 200, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            CoinBalance = wallet.CoinBalance,
            RevenueBalance = wallet.RevenueBalance
        }), 200, ct);
    }
}
