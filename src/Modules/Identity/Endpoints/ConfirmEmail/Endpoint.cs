using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Modules.Identity.Endpoints.ConfirmEmail;

public class Endpoint(UserManager<User> userManager) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/confirm-email");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "E-posta adresini onaylar.";
            s.Description = "Kayıt sonrası gönderilen doğrulama anahtarı (Confirm Token) ile hesabı aktif eder.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(req.UserId.ToString());

        if (user == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure(ApiMessages.UserNotFound), 404, ct);
            return;
        }

        var result = await userManager.ConfirmEmailAsync(user, req.Token);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            await Send.ResponseAsync(Result<Response>.Failure(errors), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = ApiMessages.EmailConfirmedSuccessfully
        }), 200, ct);
    }
}

