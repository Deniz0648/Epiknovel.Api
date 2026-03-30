using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Users.Endpoints.UpdateAvatar;

[AuditLog("Profil Resmi Güncellendi")]
public class Endpoint(UsersDbContext dbContext, IFileService fileService) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Put("/users/me/avatar");
        Summary(s => {
            s.Summary = "Profil resmini günceller.";
            s.Description = "Merkezi yükleme servisinden dönen FileName'i profile atar.";
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

        // 1. Profil kaydını bul
        var profile = await dbContext.UserProfiles
            .FirstOrDefaultAsync(x => x.UserId == userId, ct);

        if (profile == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Profil bulunamadı."), 404, ct);
            return;
        }

        // 2. Eski resmi temizle (Sadece dosya adı varsa)
        if (!string.IsNullOrEmpty(profile.AvatarUrl))
        {
            await fileService.DeleteFileAsync(profile.AvatarUrl, "profiles");
        }

        // 3. Yeni resmi ata (Resim işleme Media/Upload uç noktasında yapılmış olmalı)
        profile.AvatarUrl = req.FileName;
        await dbContext.SaveChangesAsync(ct);

        // 4. Tam URL üretip dön
        var fullUrl = fileService.GetFileUrl(req.FileName, "profiles");

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            AvatarUrl = fullUrl,
            Message = "Profil resminiz asaletle güncellendi."
        }), 200, ct);
    }
}

