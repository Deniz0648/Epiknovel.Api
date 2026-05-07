using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Data;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Constants;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Wallet.Endpoints.Admin.UploadInvoice;

public record Request
{
    public Guid OrderId { get; init; }
    public Guid InvoiceDocumentId { get; init; }
}

public class Endpoint(
    WalletDbContext dbContext, 
    INotificationService notificationService,
    IUserAccountProvider userAccountProvider) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/wallet/admin/orders/{OrderId}/invoice");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Fatura yükle ve mail at (Admin).";
            s.Description = "Adminin bir siparişe fatura yüklemesini ve sonucunda ilgili kullanıcıya e-posta dahil bildirim gönderilmesini sağlar.";
        });
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

        if (order.Status != OrderStatus.Paid)
        {
            await Send.ResponseAsync(Result<string>.Failure("Sadece ödenmiş siparişlere fatura yüklenebilir."), 400, ct);
            return;
        }

        // Faturayı Kaydet
        try 
        {
            order.InvoiceDocumentId = req.InvoiceDocumentId;
            order.InvoiceFileUrl = $"/api/compliance/documents/{req.InvoiceDocumentId}/download"; // Legacy support

            await dbContext.SaveChangesAsync(ct);

            // Kullanıcıya Bildirim ve Mail Gönder (Şablon Kullanarak)
            var (email, displayName) = await userAccountProvider.GetUserBasicInfoAsync(order.UserId, ct);
            var buyerName = displayName ?? order.BuyerEmail;
            var invoiceLink = $"/profile/orders/{order.Id}";

            await notificationService.SendTemplatedEmailAsync(order.BuyerEmail, "InvoiceCreatedEmail", new Dictionary<string, string>
            {
                { "UserName", buyerName },
                { "Amount", $"{order.PricePaid} TL" },
                { "ActionLink", invoiceLink }
            }, ct);

            var systemNotificationBody = $"{order.PricePaid} TL tutarındaki Coin alımınıza ait faturanız oluşturulmuştur. Hesabınızdan indirebilirsiniz.";

            await notificationService.SendSystemNotificationAsync(
                order.UserId, 
                "Faturanız Yüklendi", 
                systemNotificationBody, 
                invoiceLink, 
                ct);

            await Send.ResponseAsync(Result<string>.Success("Fatura başarıyla yüklendi ve kullanıcı bilgilendirildi."), 200, ct);
        }
        catch (Exception ex)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Fatura yüklenirken hata oluştu: {ex.Message}"), 500, ct);
        }
    }
}
