using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Identity.Endpoints.GetSessions;

public class Endpoint(IdentityDbContext dbContext) : EndpointWithoutRequest<Result<List<Response>>>
{
    public override void Configure()
    {
        Get("/auth/sessions");
        Summary(s => {
            s.Summary = "Aktif oturumları listeler.";
            s.Description = "Kullanıcının tüm cihazlardaki aktif oturum bilgilerini döner.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            await Send.ResponseAsync(Result<List<Response>>.Failure("Kullanıcı bulunamadı."), 401, ct);
            return;
        }

        var sessions = await dbContext.UserSessions
            .AsNoTracking()
            .Where(x => x.UserId == Guid.Parse(userId) && x.ExpiryDate > DateTime.UtcNow)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new Response
            {
                SessionId = x.Id,
                Device = x.UserAgent, // İleride parser eklenebilir
                IpAddress = x.IpAddress,
                CreatedAt = x.CreatedAt,
                IsCurrent = false // Opsiyonel: Mevcut session tespiti için JWT claim'i gerekebilir
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<List<Response>>.Success(sessions), 200, ct);
    }
}

