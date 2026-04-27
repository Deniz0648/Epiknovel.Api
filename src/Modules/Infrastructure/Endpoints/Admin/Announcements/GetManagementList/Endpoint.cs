using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Admin.Announcements.GetManagementList;

public class Response
{
    public List<ManagementAnnouncementDto> Items { get; set; } = [];
}

public class ManagementAnnouncementDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; }
    public bool IsPinned { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Endpoint(InfrastructureDbContext dbContext) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Get("/management/infrastructure/announcements");
        Policies(PolicyNames.AdminAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var items = await dbContext.Announcements
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new ManagementAnnouncementDto
            {
                Id = x.Id,
                Title = x.Title,
                Content = x.Content,
                ImageUrl = x.ImageUrl,
                IsActive = x.IsActive,
                IsPinned = x.IsPinned,
                PublishedAt = x.PublishedAt,
                ExpiresAt = x.ExpiresAt,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response { Items = items }), 200, ct);
    }
}
