using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Modules.Wallet.Services;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Wallet.Endpoints.Orders.Initialize;

public record Request
{
    public Guid CoinPackageId { get; init; }
}

public record Response
{
    public string CheckoutFormContent { get; init; } = string.Empty;
    public string Token { get; init; } = string.Empty;
}

public class Endpoint(WalletDbContext dbContext, IIyzicoService iyzicoService) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/wallet/orders/initialize");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var package = await dbContext.CoinPackages
            .FirstOrDefaultAsync(p => p.Id == req.CoinPackageId && p.IsActive, ct);

        if (package == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Paket bulunamadı."), 404, ct);
            return;
        }

        var buyerEmail = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value ?? "test@test.com";

        var order = new CoinPurchaseOrder
        {
            UserId = userId,
            CoinPackageId = package.Id,
            PricePaid = package.Price,
            CoinAmount = package.Amount + package.BonusAmount, // Toplam coin
            Status = OrderStatus.Pending,
            IyzicoConversationId = Guid.NewGuid().ToString(),
            BuyerEmail = buyerEmail
        };

        dbContext.CoinPurchaseOrders.Add(order);
        await dbContext.SaveChangesAsync(ct);

        // Iyzico Formunu Başlat
        // TODO: Gerçekte Callback URL bu api'nin callback ucu olacak (Proxy/Public URL gerekebilir)
        var callbackUrl = "https://your-api.com/api/wallet/orders/callback";
        
        // Mock Buyer (Sandbox için zorunlu ama kısıtlı bilgi yeterli)

        var iyzicoResponse = await iyzicoService.InitializeCheckoutFormAsync(
            order.IyzicoConversationId,
            order.PricePaid,
            order.Id.ToString(),
            callbackUrl,
            userId.ToString(),
            "User", // Mock name
            "Name", // Mock surname
            buyerEmail,
            "11111111111", // Mock ID
            "+905555555555", // Mock Phone
            "Istanbul", // Address
            "Istanbul",
            "Turkey",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
            ct
        );

        if (iyzicoResponse.Status != "success")
        {
            await Send.ResponseAsync(Result<Response>.Failure($"Iyzico Hatası: {iyzicoResponse.ErrorMessage}"), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            CheckoutFormContent = iyzicoResponse.CheckoutFormContent,
            Token = iyzicoResponse.Token
        }), 200, ct);
    }
}
