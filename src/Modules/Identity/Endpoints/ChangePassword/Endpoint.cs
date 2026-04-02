using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.ChangePassword;

[AuditLog("Şifre Değiştirildi")]
public class Endpoint(UserManager<User> userManager) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/auth/change-password");
        Summary(s => {
            s.Summary = "Mevcut şifreyi değiştirir.";
            s.Description = "Oturum açmış kullanıcının şifresini yeniler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.UserNotFound), 401, ct);
            return;
        }

        var user = await userManager.FindByIdAsync(userId);
        if (user == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.UserNotFound), 404, ct);
            return;
        }

        // 1. Mevcut şifreyi doğrula ve yeni şifreyi uygula
        var result = await userManager.ChangePasswordAsync(user, req.CurrentPassword, req.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            await Send.ResponseAsync(Result<Response>.Failure(errors), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = ApiMessages.PasswordChangedSuccessfully
        }), 200, ct);
    }
}

