using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Events;
using MediatR;
using System.Security.Claims;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.PaidAuthor.Review;

public record Request
{
    public Guid ApplicationId { get; init; }
    public ApplicationStatus Status { get; init; } // Approved, Rejected
    public string? AdminNote { get; init; }
}

public class Endpoint(
    ManagementDbContext dbContext, 
    IMediator mediator,
    IUserProvider userProvider) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/management/paid-author/review");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Ücretli yazarlık başvurusunu incele.";
            s.Description = "Gelen başvuruyu onaylar veya reddeder. Onay durumunda kullanıcının yetkileri güncellenir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var application = await dbContext.PaidAuthorApplications
            .FirstOrDefaultAsync(a => a.Id == req.ApplicationId, ct);

        if (application == null)
        {
            await Send.ResponseAsync(Result<string>.Failure("Başvuru bulunamadı."), 404, ct);
            return;
        }

        if (application.Status != ApplicationStatus.Pending)
        {
            await Send.ResponseAsync(Result<string>.Failure("Bu başvuru zaten sonuçlandırılmış."), 400, ct);
            return;
        }

        var adminIdString = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
        Guid.TryParse(adminIdString, out var adminId);

        application.Status = req.Status;
        application.AdminNote = req.AdminNote;
        application.ReviewedAt = DateTime.UtcNow;
        application.ReviewedByUserId = adminId;

        await dbContext.SaveChangesAsync(ct);

        if (req.Status == ApplicationStatus.Approved)
        {
            // Kullanıcı yetkisini ve IBAN bilgisini güncelle
            await userProvider.SetPaidAuthorStatusAsync(application.UserId, true, application.Iban, ct);
        }

        // 3. MERKEZİ BİLDİRİM OLAYINI YAYINLA (DECOUPLED)
        await mediator.Publish(new PaidAuthorApplicationReviewedEvent(
            application.UserId, 
            req.Status == ApplicationStatus.Approved,
            req.AdminNote), ct);

        await Send.ResponseAsync(Result<string>.Success($"Başvuru {req.Status} olarak güncellendi."), 200, ct);
    }
}
