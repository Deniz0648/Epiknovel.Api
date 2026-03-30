using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Users.Services;

public class UserSearchProvider(UsersDbContext dbContext) : IUserSearchProvider
{
    public async Task<IEnumerable<UserProfileUpdatedEvent>> GetIndexableUsersAsync()
    {
        var users = await dbContext.UserProfiles
            .ToListAsync();

        return users.Select(u => new UserProfileUpdatedEvent(
            UserId: u.UserId,
            DisplayName: u.DisplayName,
            Slug: u.Slug,
            Bio: u.Bio,
            AvatarUrl: u.AvatarUrl
        ));
    }
}
