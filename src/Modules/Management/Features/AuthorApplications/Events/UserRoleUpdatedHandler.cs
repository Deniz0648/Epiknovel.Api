using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Features.AuthorApplications.Events;

/// <summary>
/// Kullanıcı rollerinin manuel değişimini takip ederek yazar başvurularını senkronize eder.
/// </summary>
public class UserRoleUpdatedHandler(ManagementDbContext dbContext) : INotificationHandler<UserRoleUpdatedEvent>
{
    public async Task Handle(UserRoleUpdatedEvent notification, CancellationToken ct)
    {
        var roleList = notification.NewRole.Split('|', StringSplitOptions.RemoveEmptyEntries);
        var hasAuthorRole = roleList.Any(r => string.Equals(r, RoleNames.Author, StringComparison.OrdinalIgnoreCase));

        // Kullanıcıya ait en son başvuruyu buluyoruz (statüsü ne olursa olsun)
        var latestApplication = await dbContext.AuthorApplications
            .Where(a => a.UserId == notification.UserId)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (latestApplication == null) return;

        bool changed = false;

        if (hasAuthorRole)
        {
            // Eğer yazar rolü verildiyse ve bekleyen bir başvurusu varsa otomatik onayla
            if (latestApplication.Status == ApplicationStatus.Pending)
            {
                latestApplication.Status = ApplicationStatus.Approved;
                latestApplication.ReviewedAt = DateTime.UtcNow;
                latestApplication.RejectionReason = null; // Eski bir red nedeni varsa temizle
                changed = true;
            }
        }
        else
        {
            // Eğer yazar rolü alındıysa, bekleyen veya hali hazırda onaylı olan son başvuruyu "Reddedildi" (İptal) durumuna çek
            if (latestApplication.Status == ApplicationStatus.Pending || latestApplication.Status == ApplicationStatus.Approved)
            {
                latestApplication.Status = ApplicationStatus.Rejected;
                latestApplication.ReviewedAt = DateTime.UtcNow;
                latestApplication.RejectionReason = "Yönetici tarafından yazarlık yetkileriniz alınmıştır.";
                changed = true;
            }
        }

        if (changed)
        {
            await dbContext.SaveChangesAsync(ct);
        }
    }
}
