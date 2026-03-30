using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Events;
using MediatR;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Wallet.Endpoints.Orders.UploadInvoice;

public record Request
{
    public Guid OrderId { get; init; }
    public IFormFile InvoiceFile { get; init; } = null!;
}

public class Endpoint(WalletDbContext dbContext, IFileService fileService, IMediator mediator) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/wallet/orders/upload-invoice");
        AllowFileUploads();
        Policies(PolicyNames.AdminAccess);
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var order = await dbContext.CoinPurchaseOrders
            .FirstOrDefaultAsync(o => o.Id == req.OrderId, ct);

        if (order == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Sipariş bulunamadı."), 404, ct);
            return;
        }

        // 1. Dosyayı Güvenli Kaydet
        var fileUrl = await fileService.SaveSecureDocumentAsync(req.InvoiceFile, "invoices");

        // 2. Siparişi Güncelle
        order.InvoiceFileUrl = fileUrl;
        await dbContext.SaveChangesAsync(ct);

        // 3. OLAYI YAYINLA (DECOUPLED NOTIFICATION)
        // Artık burada bildirim servisini direkt çağırmıyoruz!
        await mediator.Publish(new InvoiceUploadedEvent(order.UserId, order.Id, fileUrl), ct);

        await Send.ResponseAsync(Result<string>.Success("Fatura başarıyla yüklendi ve kullanıcıya bildirim tetiklendi."), 200, ct);
    }
}
