using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using System.Security.Claims;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.RevokeSession;

[AuditLog("Oturum Sonlandırıldı")]
public class Endpoint(IdentityDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Delete("/identity/sessions/{SessionId}");
        Summary(s => {
            s.Summary = "Belirli bir oturumu sonlandırır.";
            s.Description = "Seçilen cihazdaki oturumu kapatır ve Refresh Token'ı geçersiz kılar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdString == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kullanıcı bulunamadı."), 401, ct);
            return;
        }

        var userId = Guid.Parse(userIdString);
        
        // 1. Session'ı bul ve kullanıcının olduğundan emin ol (Güvenlik!)
        var session = await dbContext.UserSessions
            .FirstOrDefaultAsync(x => x.Id == req.SessionId && x.UserId == userId, ct);

        if (session == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.SessionNotFound), 404, ct);
            return;
        }

        // 2. Oturumu kapat
        dbContext.UserSessions.Remove(session);
        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = ApiMessages.SessionRevokedSuccessfully
        }), 200, ct);
    }
}

