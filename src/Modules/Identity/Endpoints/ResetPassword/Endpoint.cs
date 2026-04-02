using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.ResetPassword;

[AuditLog("Şifre Sıfırlandı (Token ile)")]
public class Endpoint(UserManager<User> userManager) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/auth/reset-password");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Şifreyi sıfırlar.";
            s.Description = "Sıfırlama anahtarı (Reset Token) ile yeni bir şifre belirler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(req.Email);

        if (user == null)
        {
            // Güvenlik: Kullanıcı yoksa bile başarılı yanıt verilmez (Reset Token sadece belirli kullanıcıya aittir)
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.UserNotFound), 400, ct);
            return;
        }

        var result = await userManager.ResetPasswordAsync(user, req.Token, req.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            await Send.ResponseAsync(Result<Response>.Failure(errors), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = ApiMessages.PasswordResetSuccessfully
        }), 200, ct);
    }
}

