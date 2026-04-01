using FastEndpoints;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Modules.Infrastructure.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Announcements.Create;

public class Request
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsPinned { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

public class Response
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
}

[AuditLog("Duyuru Oluşturuldu")]
public class Endpoint(InfrastructureDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/infrastructure/announcements");
        Policies(PolicyNames.AdminAccess);
        Summary(s =>
        {
            s.Summary = "Yeni duyuru oluşturur.";
            s.Description = "Admin/SuperAdmin için duyuru oluşturma endpointidir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var announcement = new Announcement
        {
            Title = req.Title.Trim(),
            Content = req.Content.Trim(),
            ImageUrl = string.IsNullOrWhiteSpace(req.ImageUrl) ? null : req.ImageUrl.Trim(),
            IsActive = req.IsActive,
            IsPinned = req.IsPinned,
            ExpiresAt = req.ExpiresAt
        };

        dbContext.Announcements.Add(announcement);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Id = announcement.Id,
            Title = announcement.Title
        }), 201, ct);
    }
}

