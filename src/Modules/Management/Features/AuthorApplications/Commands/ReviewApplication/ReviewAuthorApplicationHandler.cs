using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Features.AuthorApplications.Commands.ReviewApplication;

public class ReviewAuthorApplicationHandler(
    ManagementDbContext dbContext,
    IMediator mediator,
    IUserProvider userProvider,
    IUserRoleProvider userRoleProvider) : IRequestHandler<ReviewAuthorApplicationCommand, Result<string>>
{
    public async Task<Result<string>> Handle(ReviewAuthorApplicationCommand request, CancellationToken ct)
    {
        var application = await dbContext.AuthorApplications
            .FirstOrDefaultAsync(a => a.Id == request.ApplicationId, ct);

        if (application == null)
        {
            return Result<string>.Failure("Başvuru bulunamadı.");
        }

        if (application.Status != ApplicationStatus.Pending)
        {
            return Result<string>.Failure("Bu başvuru zaten sonuçlandırılmış.");
        }

        application.Status = request.Status;
        application.RejectionReason = request.RejectionReason;
        application.ReviewedAt = DateTime.UtcNow;
        application.ReviewedByUserId = request.AdminUserId;

        await dbContext.SaveChangesAsync(ct);

        if (request.Status == ApplicationStatus.Approved)
        {
            // Update User Profile (Module Decoupling via Provider)
            await userProvider.SetAuthorStatusAsync(application.UserId, true, ct);

            // Update Identity Role (Identity Decoupling via Provider)
            await userRoleProvider.AddRoleAsync(application.UserId, RoleNames.Author, ct);
        }

        // Domain Event (Decoupled Notify)
        await mediator.Publish(new AuthorApplicationReviewedEvent(
            application.UserId, 
            request.Status == ApplicationStatus.Approved,
            request.RejectionReason), ct);

        return Result<string>.Success($"Yazarlık başvurusu {request.Status} olarak güncellendi.");
    }
}
