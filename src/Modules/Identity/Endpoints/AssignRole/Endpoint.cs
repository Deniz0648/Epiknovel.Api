using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.AssignRole;

[AuditLog("Rol Atama İşlemi")]
public class Endpoint(
    IManagementUserProvider managementUserProvider,
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
        // 1. Rolün varlığını kontrol et
        if (!await roleManager.RoleExistsAsync(req.RoleName))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Belirtilen rol sistemde mevcut değil."), 400, ct);
            return;
        }

        // 2. Rolü merkezi hiyerarşi servisi üzerinden güncelle
        var success = await managementUserProvider.UpdateUserRoleAsync(req.UserId, req.RoleName, ct);
        if (!success)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Rol güncellenemedi. Yetki hiyerarşisi veya kullanıcı durumu uygun değil."), 403, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = $"{req.UserId} kullanıcısının rolü {req.RoleName} olarak güncellendi."
        }), 200, ct);
    }
}

