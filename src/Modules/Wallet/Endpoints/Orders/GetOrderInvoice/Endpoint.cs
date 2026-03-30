using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using System.Security.Claims;

namespace Epiknovel.Modules.Wallet.Endpoints.Orders.GetOrderInvoice;

public record Request
{
    public Guid OrderId { get; init; }
}

public class Endpoint(WalletDbContext dbContext, IFileService fileService) : Endpoint<Request>
{
    public override void Configure()
    {
        Get("/wallet/orders/{OrderId}/invoice");
        Summary(s => {
            s.Summary = "Sipariş faturasını indir.";
            s.Description = "Kullanıcının satın aldığı coin paketine ait daha önceden yüklenmiş faturasını güvenli bir şekilde bilgisayarına indirmesini sağlar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        var order = await dbContext.CoinPurchaseOrders
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == req.OrderId, ct);

        if (order == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Not Found"), 404, ct);
            return;
        }

        // BOLA Kontrolü: SADECE sipariş sahibi faturaya erişebilir
        if (order.UserId != userId)
        {
            await Send.ResponseAsync(Result<string>.Failure("Forbidden"), 403, ct);
            return;
        }

        if (string.IsNullOrEmpty(order.InvoiceFileUrl))
        {
            await Send.ResponseAsync(Result<string>.Failure("Invoice not uploaded yet."), 404, ct);
            return;
        }

        try
        {
            var stream = await fileService.GetSecureFileStreamAsync(order.InvoiceFileUrl, "invoices");
            
            // Dosya uzantısını belirle (genelde PDF)
            var contentType = "application/pdf";
            if (order.InvoiceFileUrl.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase)) contentType = "image/jpeg";
            if (order.InvoiceFileUrl.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) contentType = "image/png";

            await Send.StreamAsync(stream, order.InvoiceFileUrl, stream.Length, contentType, cancellation: ct);
        }
        catch (FileNotFoundException)
        {
            await Send.ResponseAsync(Result<string>.Failure("File not found on server."), 404, ct);
        }
        catch (Exception)
        {
            await Send.ResponseAsync(Result<string>.Failure("Internal Server Error"), 500, ct);
        }
    }
}
