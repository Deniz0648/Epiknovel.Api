using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Common;

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
        profile.DisplayName = req.DisplayName.Trim();
        profile.Bio = req.Bio;
        
        var requestedSlug = req.Slug?.Trim();
        if (!string.IsNullOrWhiteSpace(requestedSlug))
        {
            var normalizedSlug = SlugHelper.ToSlug(requestedSlug);
            if (string.IsNullOrWhiteSpace(normalizedSlug))
            {
                await Send.ResponseAsync(Result<Response>.Failure("Geçerli bir slug giriniz."), 400, ct);
                return;
            }

            if (!string.Equals(profile.Slug, normalizedSlug, StringComparison.Ordinal))
            {
                var slugTakenByProfile = await dbContext.UserProfiles
                    .AnyAsync(x => x.Slug == normalizedSlug && x.UserId != req.UserId, ct);

                if (slugTakenByProfile)
                {
                    await Send.ResponseAsync(Result<Response>.Failure("Bu slug zaten kullanılıyor."), 400, ct);
                    return;
                }

                var historyOwnerId = await dbContext.UserSlugHistories
                    .AsNoTracking()
                    .Where(x => x.Slug == normalizedSlug)
                    .Select(x => (Guid?)x.UserId)
                    .FirstOrDefaultAsync(ct);

                if (historyOwnerId.HasValue && historyOwnerId.Value != req.UserId)
                {
                    await Send.ResponseAsync(Result<Response>.Failure("Bu slug daha önce kullanıldığı için rezerve edildi."), 400, ct);
                    return;
                }

                if (historyOwnerId.HasValue && historyOwnerId.Value == req.UserId)
                {
                    var reclaimRows = await dbContext.UserSlugHistories
                        .Where(x => x.UserId == req.UserId && x.Slug == normalizedSlug)
                        .ToListAsync(ct);

                    if (reclaimRows.Count > 0)
                    {
                        dbContext.UserSlugHistories.RemoveRange(reclaimRows);
                    }
                }

                var hasCurrentSlugInHistory = await dbContext.UserSlugHistories
                    .AnyAsync(x => x.UserId == req.UserId && x.Slug == profile.Slug, ct);

                if (!hasCurrentSlugInHistory)
                {
                    dbContext.UserSlugHistories.Add(new Domain.UserSlugHistory
                    {
                        UserId = req.UserId,
                        Slug = profile.Slug
                    });
                }

                profile.Slug = normalizedSlug;
            }
        }

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Profil bilgileriniz başarıyla güncellendi."
        }), 200, ct);
    }
}

