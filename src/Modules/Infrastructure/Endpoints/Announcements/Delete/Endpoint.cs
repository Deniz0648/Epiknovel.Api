using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Epiknovel.Modules.Infrastructure.Data;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Infrastructure.Endpoints.Announcements.Delete;

public class Request
{
    public Guid Id { get; set; }
}

public class Response
{
    public string Message { get; set; } = string.Empty;
}

[AuditLog("Duyuru Silindi (Soft Delete)")]
public class Endpoint(InfrastructureDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Delete("/infrastructure/announcements/{Id}");
        Policies(PolicyNames.AdminAccess);
        Summary(s =>
        {
            s.Summary = "Duyuruyu soft delete yapar.";
            s.Description = "Duyuruyu fiziksel silmez; IsDeleted=true olarak işaretler.";
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

        var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdStr, out var actorId);

        announcement.IsDeleted = true;
        announcement.DeletedAt = DateTime.UtcNow;
        announcement.DeletedByUserId = actorId == Guid.Empty ? null : actorId;
        announcement.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Duyuru kaldirildi."
        }), 200, ct);
    }
}

