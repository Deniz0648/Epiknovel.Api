using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.AssignRole;

[AuditLog("Rol Atama İşlemi")]
public class Endpoint(
    UserManager<User> userManager,
    RoleManager<IdentityRole<Guid>> roleManager) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/roles/assign");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Kullanıcıya yeni bir rol atar.";
            s.Description = "Yöneticilerin diğer kullanıcılara rol vermesini sağlar. Admin, SuperAdmin atayamaz.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Hedef kullanıcıyı bul
        var targetUser = await userManager.FindByIdAsync(req.UserId.ToString());
        if (targetUser == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.UserNotFound), 404, ct);
            return;
        }

        // 2. Yetki Hiyerarşisi Kontrolü: 
        // Sadece SuperAdmin olanlar başka birini SuperAdmin yapabilir.
        if (req.RoleName == RoleNames.SuperAdmin && !User.IsInRole(RoleNames.SuperAdmin))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Buna yetkiniz yok. Sadece SuperAdmin rütbe yükseltebilir."), 403, ct);
            return;
        }

        // 3. Rolün varlığını kontrol et
        if (!await roleManager.RoleExistsAsync(req.RoleName))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Belirtilen rol sistemde mevcut değil."), 400, ct);
            return;
        }

        // 4. Rolü ata (Kullanıcıda zaten varsa bir şey yapmaz, yoksa ekler)
        if (!await userManager.IsInRoleAsync(targetUser, req.RoleName))
        {
            var result = await userManager.AddToRoleAsync(targetUser, req.RoleName);
            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                await Send.ResponseAsync(Result<Response>.Failure(errors), 400, ct);
                return;
            }
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = $"{targetUser.UserName} kullanıcısına {req.RoleName} rolü başarıyla atandı."
        }), 200, ct);
    }
}

