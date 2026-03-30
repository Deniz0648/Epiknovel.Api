using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;
using System.Security.Claims;

namespace Epiknovel.Modules.Management.Endpoints.Author.Review;

public record Request
{
    public Guid ApplicationId { get; init; }
    public ApplicationStatus Status { get; init; } // Approved, Rejected
    public string? RejectionReason { get; init; }
}

public class Endpoint(
    ManagementDbContext dbContext, 
    IMediator mediator,
    IUserProvider userProvider,
    IUserRoleProvider userRoleProvider) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/management/author/review");
        Policies(PolicyNames.AdminAccess);
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var application = await dbContext.AuthorApplications
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
        application.RejectionReason = req.RejectionReason;
        application.ReviewedAt = DateTime.UtcNow;
        application.ReviewedByUserId = adminId;

        await dbContext.SaveChangesAsync(ct);

        if (req.Status == ApplicationStatus.Approved)
        {
            // 1. Profil Bayrağını Set Et (Users Module)
            await userProvider.SetAuthorStatusAsync(application.UserId, true, ct);

            // 2. Resmi Kimlik Rolünü Ekle (Identity Module)
            await userRoleProvider.AddRoleAsync(application.UserId, RoleNames.Author, ct);
        }

        // 3. MERKEZİ BİLDİRİM OLAYINI YAYINLA (DECOUPLED)
        // Red veya Onay durumunda merkezi handler bunu yakalayıp uygun bildirimi atacaktır.
        await mediator.Publish(new AuthorApplicationReviewedEvent(
            application.UserId, 
            req.Status == ApplicationStatus.Approved,
            req.RejectionReason), ct);

        await Send.ResponseAsync(Result<string>.Success($"Yazarlık başvurusu {req.Status} olarak güncellendi."), 200, ct);
    }
}
