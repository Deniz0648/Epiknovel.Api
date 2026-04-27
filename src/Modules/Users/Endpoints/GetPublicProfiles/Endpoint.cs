using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Interfaces.Books;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.GetPublicProfiles;

public class Endpoint(UsersDbContext dbContext, IFileService fileService, IBookProvider bookProvider) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/users");
        Policies("BOLA"); // Public veri olsa da endpoint'e erişim kimlik doğrulamalı.
        ResponseCache(30);
        Summary(s =>
        {
            s.Summary = "Public kullanıcı listesini getirir.";
            s.Description = "BOLA korumalı, sınırlı alanlarla topluluk profil listesini döner.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var pageNumber = req.PageNumber < 1 ? 1 : req.PageNumber;
        var pageSize = req.PageSize < 1 ? 20 : Math.Min(req.PageSize, 50);
        var queryText = req.Query?.Trim();

        var query = dbContext.UserProfiles
            .AsNoTracking()
            .Where(x => !x.IsDeleted);

        if (!string.IsNullOrWhiteSpace(queryText))
        {
            query = query.Where(x => x.DisplayName.Contains(queryText) || x.Slug.Contains(queryText));
        }

        if (req.IsAuthor.HasValue)
        {
            query = query.Where(x => x.IsAuthor == req.IsAuthor.Value);
        }

        var currentUserIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid currentUserId = Guid.Empty;
        if (!string.IsNullOrWhiteSpace(currentUserIdStr))
        {
            Guid.TryParse(currentUserIdStr, out currentUserId);
        }

        if (req.FollowedByMe == true && currentUserId != Guid.Empty)
        {
            var followedUserIds = await dbContext.Follows
                .Where(f => f.FollowerId == currentUserId)
                .Select(f => f.FollowingId)
                .ToListAsync(ct);
            
            query = query.Where(x => followedUserIds.Contains(x.UserId));
        }

        var sortBy = (req.SortBy ?? "joinedAt").Trim().ToLowerInvariant();
        var sortDirection = (req.SortDirection ?? "desc").Trim().ToLowerInvariant();
        var isAscending = sortDirection == "asc";

        query = sortBy switch
        {
            "displayname" => isAscending
                ? query.OrderBy(x => x.DisplayName)
                : query.OrderByDescending(x => x.DisplayName),
            "followers" => isAscending
                ? query.OrderBy(x => x.TotalFollowers)
                : query.OrderByDescending(x => x.TotalFollowers),
            "joinedat" => isAscending
                ? query.OrderBy(x => x.CreatedAt)
                : query.OrderByDescending(x => x.CreatedAt),
            _ => query.OrderByDescending(x => x.CreatedAt),
        };

        var totalCount = await query.CountAsync(ct);

        var profiles = await query
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.UserId,
                x.Slug,
                x.DisplayName,
                x.Bio,
                x.AvatarUrl,
                x.IsAuthor,
                x.TotalFollowers,
                x.TotalFollowing,
                x.CreatedAt,
            })
            .ToListAsync(ct);

        var profileUserIds = profiles.Select(x => x.UserId).Distinct().ToList();
        var booksCountByAuthor = await bookProvider.GetPublishedBookCountsByAuthorIdsAsync(profileUserIds, ct);

        var followingIds = new HashSet<Guid>();
        if (currentUserId != Guid.Empty)
        {
            var targetUserIds = profiles.Select(x => x.UserId).ToList();
            followingIds = await dbContext.Follows
                .Where(f => f.FollowerId == currentUserId && targetUserIds.Contains(f.FollowingId))
                .Select(f => f.FollowingId)
                .ToHashSetAsync(ct);
        }

        var items = profiles.Select(x => new PublicProfileListItem
        {
            UserId = x.UserId,
            Slug = x.Slug,
            DisplayName = x.DisplayName,
            Bio = x.Bio,
            AvatarUrl = string.IsNullOrEmpty(x.AvatarUrl)
                ? null
                : fileService.GetFileUrl(x.AvatarUrl, "profiles"),
            IsAuthor = x.IsAuthor,
            BooksCount = booksCountByAuthor.TryGetValue(x.UserId, out var booksCount) ? booksCount : 0,
            FollowersCount = x.TotalFollowers,
            FollowingCount = x.TotalFollowing,
            IsFollowing = followingIds.Contains(x.UserId),
            JoinedAt = x.CreatedAt,
        }).ToList();

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Items = items,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalCount = totalCount,
        }), 200, ct);
    }
}
