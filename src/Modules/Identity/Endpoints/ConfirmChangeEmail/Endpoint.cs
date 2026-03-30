using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Identity.Endpoints.ConfirmChangeEmail;

public class Endpoint(UserManager<User> userManager) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/confirm-change-email");
        Summary(s => {
            s.Summary = "E-posta adresi değişimini onaylar.";
            s.Description = "Yeni adrese gelen onay anahtarı (Change Token) ile e-posta adresini kalıcı olarak günceller.";
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

        // 1. E-posta adresini ve kullanıcı adını (varsayılanımız email) güncelle
        var result = await userManager.ChangeEmailAsync(user, req.NewEmail, req.Token);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            await Send.ResponseAsync(Result<Response>.Failure(errors), 400, ct);
            return;
        }

        // 2. Kullanıcı adını da yeni e-posta yapıyoruz (Sistem tasarımımız gereği)
        await userManager.SetUserNameAsync(user, req.NewEmail);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = ApiMessages.EmailChangedSuccessfully
        }), 200, ct);
    }
}

