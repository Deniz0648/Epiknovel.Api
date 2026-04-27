using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Announcements.Update;

public class Request
{
    public Guid Id { get; set; }
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? ImageUrl { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsPinned { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool? ClearExpiresAt { get; set; }
}

public class Response
{
    public string Message { get; set; } = string.Empty;
}

[AuditLog("Duyuru Güncellendi")]
public class Endpoint(InfrastructureDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Patch("/infrastructure/announcements/{Id}");
        Policies(PolicyNames.AdminAccess);
        Summary(s =>
        {
            s.Summary = "Duyuruyu günceller.";
            s.Description = "Admin/SuperAdmin için duyuru güncelleme endpointidir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var announcement = await dbContext.Announcements
            .FirstOrDefaultAsync(x => x.Id == req.Id && !x.IsDeleted, ct);

        if (announcement == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Duyuru bulunamadi."), 404, ct);
            return;
        }

        if (req.Title is not null)
        {
            announcement.Title = req.Title.Trim();
        }

        if (req.Content is not null)
        {
            announcement.Content = req.Content.Trim();
        }

        if (req.ImageUrl is not null)
        {
            announcement.ImageUrl = string.IsNullOrWhiteSpace(req.ImageUrl) ? null : req.ImageUrl.Trim();
        }

        if (req.IsActive.HasValue)
        {
            announcement.IsActive = req.IsActive.Value;
        }

        if (req.IsPinned.HasValue)
        {
            announcement.IsPinned = req.IsPinned.Value;
        }

        if (req.PublishedAt.HasValue)
        {
            announcement.PublishedAt = req.PublishedAt.Value;
        }

        if (req.ClearExpiresAt == true)
        {
            announcement.ExpiresAt = null;
        }
        else if (req.ExpiresAt.HasValue)
        {
            announcement.ExpiresAt = req.ExpiresAt.Value;
        }

        announcement.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Duyuru guncellendi."
        }), 200, ct);
    }
}
