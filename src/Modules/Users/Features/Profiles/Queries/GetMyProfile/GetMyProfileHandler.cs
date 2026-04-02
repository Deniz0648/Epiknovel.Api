using Epiknovel.Modules.Users.Data;
using Epiknovel.Modules.Users.Domain;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Common;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Features.Profiles.Queries.GetMyProfile;

public class GetMyProfileHandler(
    UsersDbContext dbContext,
    IFileService fileService,
    IUserAccountProvider userAccountProvider,
    IPermissionService permissionService) : IRequestHandler<GetMyProfileQuery, Result<MyProfileResponse>>
{
    public async Task<Result<MyProfileResponse>> Handle(GetMyProfileQuery request, CancellationToken ct)
    {
        // 1. Get Profile
        var profile = await dbContext.UserProfiles
            .FirstOrDefaultAsync(x => x.UserId == request.UserId, ct);

        // 2. Self-Healing
        if (profile == null)
        {
            var displayName = !string.IsNullOrWhiteSpace(request.IdentityName) ? request.IdentityName : "Okur";
            profile = new UserProfile
            {
                UserId = request.UserId,
                DisplayName = displayName,
                Slug = SlugHelper.ToSlug(displayName),
                Bio = "Merhaba! Epiknovel'e hoş geldim.",
                TotalFollowers = 0,
                TotalFollowing = 0
            };

            if (string.IsNullOrWhiteSpace(profile.Slug)) profile.Slug = "okur";

            // Collision check
            var baseSlug = profile.Slug;
            var suffix = 1;
            while (await dbContext.UserProfiles.AnyAsync(x => x.Slug == profile.Slug, ct))
            {
                profile.Slug = $"{baseSlug}-{suffix++}";
            }

            dbContext.UserProfiles.Add(profile);
            await dbContext.SaveChangesAsync(ct);
        }

        // 3. Mapping
        // Build a fake ClaimsPrincipal for PermissionService (standard across the project)
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, request.UserId.ToString()) };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "Default"));
        
        var permissions = await permissionService.GetSnapshotAsync(principal, ct);

        var response = new MyProfileResponse
        {
            UserId = profile.UserId,
            DisplayName = profile.DisplayName,
            Slug = profile.Slug,
            Bio = profile.Bio,
            FollowersCount = profile.TotalFollowers,
            FollowingCount = profile.TotalFollowing,
            EmailConfirmed = await userAccountProvider.IsEmailConfirmedAsync(profile.UserId, ct),
            IsAuthor = permissions.CreateBook,
            Permissions = permissions,
            AvatarUrl = string.IsNullOrEmpty(profile.AvatarUrl) 
                ? null 
                : fileService.GetFileUrl(profile.AvatarUrl, "profiles")
        };

        return Result<MyProfileResponse>.Success(response);
    }
}
