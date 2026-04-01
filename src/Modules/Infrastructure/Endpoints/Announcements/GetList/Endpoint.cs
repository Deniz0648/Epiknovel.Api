using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Announcements.GetList;

public class Response
{
    public List<AnnouncementDto> Items { get; set; } = [];
}

public class AnnouncementDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsPinned { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class Endpoint(InfrastructureDbContext dbContext) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Get("/infrastructure/announcements");
        AllowAnonymous();
        ResponseCache(60);
        Summary(s =>
        {
            s.Summary = "Aktif duyuruları listeler.";
            s.Description = "Yayında olan duyuruları sabitlenenler üstte olacak şekilde döner.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        var items = await dbContext.Announcements
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.IsActive && (!x.ExpiresAt.HasValue || x.ExpiresAt > now))
            .OrderByDescending(x => x.IsPinned)
            .ThenByDescending(x => x.CreatedAt)
            .Take(100)
            .Select(x => new AnnouncementDto
            {
                Id = x.Id,
                Title = x.Title,
                Content = x.Content,
                ImageUrl = x.ImageUrl,
                IsPinned = x.IsPinned,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response { Items = items }), 200, ct);
    }
}
