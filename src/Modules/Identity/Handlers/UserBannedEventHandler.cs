using System.Threading;
using System.Threading.Tasks;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Modules.Identity.Domain;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using Microsoft.AspNetCore.Identity;

namespace Epiknovel.Modules.Identity.Handlers;

public class UserBannedEventHandler(
    IdentityDbContext dbContext,
    UserManager<User> userManager) : INotificationHandler<UserBannedEvent>
{
    public async Task Handle(UserBannedEvent notification, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Id == notification.UserId, cancellationToken);
        
        if (user != null)
        {
            // Kullanıcıyı yasakla
            user.IsBanned = true;
            user.BannedUntil = notification.BannedUntil;
            user.BanReason = notification.Reason;
            user.UpdatedAt = DateTime.UtcNow;
            
            // Lockout özelliğini kullanarak girişi engelle
            await userManager.SetLockoutEnabledAsync(user, true);
            await userManager.SetLockoutEndDateAsync(user, notification.BannedUntil);
            
            // Opsiyonel: Mevcut session'larını temizle (Kullanıcının hemen Logout olmasını sağlamak için)
            var sessions = await dbContext.UserSessions
                .Where(s => s.UserId == user.Id && !s.IsRevoked)
                .ToListAsync(cancellationToken);
            
            foreach (var session in sessions)
            {
                session.IsRevoked = true;
                session.RevokedAt = DateTime.UtcNow;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
