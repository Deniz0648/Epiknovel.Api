using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Users.Endpoints.UpdateProfile;

[AuditLog("Profil Bilgileri Güncellendi")]
public class Endpoint(UsersDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Put("/users/me");
        Summary(s => {
            s.Summary = "Profil bilgilerini günceller.";
            s.Description = "Oturum açmış kullanıcının Görünen Ad ve Biyografi bilgilerini yeniler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Kullanıcının profilini bul (BOLA: Altyapı tarafındanUserId doğrulandı)
        var profile = await dbContext.UserProfiles
            .FirstOrDefaultAsync(x => x.UserId == req.UserId, ct);

        if (profile == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Profil bulunamadı."), 404, ct);
            return;
        }

        // 2. Verileri güncelle
        profile.DisplayName = req.DisplayName;
        profile.Bio = req.Bio;

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Profil bilgileriniz başarıyla güncellendi."
        }), 200, ct);
    }
}

