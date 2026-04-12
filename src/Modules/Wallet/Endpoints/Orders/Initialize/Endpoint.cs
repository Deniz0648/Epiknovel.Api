using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Modules.Wallet.Services;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

using Epiknovel.Shared.Core.Interfaces.Management;

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

public class Endpoint(
    WalletDbContext dbContext, 
    IIyzicoService iyzicoService, 
    Epiknovel.Shared.Core.Interfaces.Management.ISystemSettingProvider settings,
    Epiknovel.Shared.Core.Interfaces.IUserAccountProvider userAccountProvider,
    Epiknovel.Shared.Core.Interfaces.IUserProvider userProvider) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/wallet/orders/initialize");
        Summary(s => {
            s.Summary = "Coin paketi satın alma işlemini başlat.";
            s.Description = "Kullanıcı bir coin paketi seçtiğinde Iyzico ödeme formunu başlatır ve geçici bir sipariş kaydı oluşturur.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Unauthorized"), 401, ct);
            return;
        }

        // 🚀 GLOBAL SETTING CHECK (WALLET ENABLED?)
        var walletEnabled = await settings.GetSettingValueAsync<string>("CONTENT_EnableWallet", ct);
        if (walletEnabled == "false" && !User.IsInRole("Admin") && !User.IsInRole("SuperAdmin"))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Cüzdan ve satın alım işlemleri geçici olarak kapalıdır."), 403, ct);
            return;
        }

        var package = await dbContext.CoinPackages
            .FirstOrDefaultAsync(p => p.Id == req.CoinPackageId && p.IsActive, ct);

        if (package == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Seçilen paket aktif değil veya bulunamadı."), 404, ct);
            return;
        }

        // 🔍 Gerçek kullanıcı bilgilerini al (Iyzico için zorunlu)
        var (userEmail, displayName) = await userAccountProvider.GetUserBasicInfoAsync(userId, ct);
        var buyerEmail = userEmail ?? User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value ?? "guest@epiknovel.com";
        var buyerName = displayName ?? "Epiknovel";

        // 🏠 Fatura adresi kontrolü
        var billingAddress = await userProvider.GetBillingAddressAsync(userId, ct);
        if (billingAddress == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Ödeme yapabilmek için lütfen profilinizden fatura bilgilerinizi doldurun."), 400, ct);
            return;
        }

        var order = new CoinPurchaseOrder
        {
            UserId = userId,
            CoinPackageId = package.Id,
            PricePaid = package.Price,
            CoinAmount = package.Amount + package.BonusAmount, 
            Status = OrderStatus.Pending,
            IyzicoConversationId = Guid.NewGuid().ToString(),
            BuyerEmail = buyerEmail
        };

        dbContext.CoinPurchaseOrders.Add(order);
        await dbContext.SaveChangesAsync(ct);

        // 🌐 DINAMIK CALLBACK URL: Proxy/Frontend üzerinden gelen Host bilgisini kullan
        var proto = HttpContext.Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? HttpContext.Request.Scheme;
        var host = HttpContext.Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? HttpContext.Request.Host.Value;
        
        // Önemli: Iyzico callback'i bizim API ucumuz olan /api/wallet/orders/callback noktasına gelmeli
        var callbackUrl = $"{proto}://{host}/api/wallet/orders/callback";
        
        var iyzicoResponse = await iyzicoService.InitializeCheckoutFormAsync(
            order.IyzicoConversationId,
            order.PricePaid,
            order.Id.ToString(),
            callbackUrl,
            userId.ToString(),
            billingAddress.FullName, // Gerçek isim
            "User",    
            buyerEmail,
            billingAddress.IdentityNumber ?? "11111111111", 
            billingAddress.PhoneNumber, 
            billingAddress.AddressLine, 
            billingAddress.City, 
            billingAddress.Country,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
            ct
        );

        if (iyzicoResponse.Status != "success")
        {
            await Send.ResponseAsync(Result<Response>.Failure($"Ödeme servisi hatası: {iyzicoResponse.ErrorMessage}"), 400, ct);
            return;
        }

        // 🛡️ DİKKAT: Webhook'tan (veya sayfa içi yönlendirmeden) önce token'ın 
        // veritabanında kesin olarak commit edildiğinden emin ol (Out-of-Order protection)
        order.IyzicoToken = iyzicoResponse.Token;
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            CheckoutFormContent = iyzicoResponse.CheckoutFormContent,
            Token = iyzicoResponse.Token
        }), 200, ct);
    }
}
