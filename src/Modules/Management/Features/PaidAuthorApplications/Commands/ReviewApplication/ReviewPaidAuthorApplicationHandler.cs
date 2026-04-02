using Epiknovel.Modules.Management.Data;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Features.PaidAuthorApplications.Commands.ReviewApplication;

public class ReviewPaidAuthorApplicationHandler(
    ManagementDbContext dbContext,
    IMediator mediator,
    IUserProvider userProvider) : IRequestHandler<ReviewPaidAuthorApplicationCommand, Result<string>>
{
    public async Task<Result<string>> Handle(ReviewPaidAuthorApplicationCommand request, CancellationToken ct)
    {
        var application = await dbContext.PaidAuthorApplications
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
        application.AdminNote = request.AdminNote;
        application.ReviewedAt = DateTime.UtcNow;
        application.ReviewedByUserId = request.AdminUserId;

        await dbContext.SaveChangesAsync(ct);

        if (request.Status == ApplicationStatus.Approved)
        {
            // Update User Profile with IBAN (Financial Decoupling via Provider)
            await userProvider.SetPaidAuthorStatusAsync(application.UserId, true, application.Iban, ct);
        }

        // Domain Event (Decoupled Notify)
        await mediator.Publish(new PaidAuthorApplicationReviewedEvent(
            application.UserId, 
            request.Status == ApplicationStatus.Approved,
            request.AdminNote), ct);

        return Result<string>.Success($"Başvuru {request.Status} olarak güncellendi.");
    }
}
