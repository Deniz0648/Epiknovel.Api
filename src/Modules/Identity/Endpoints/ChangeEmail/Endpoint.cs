using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Services;
using System.Security.Claims;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.ChangeEmail;

[AuditLog("E-posta Değiştirme Talebi")]
public class Endpoint(UserManager<User> userManager, IEmailService emailService) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/change-email");
        Summary(s => {
            s.Summary = "E-posta değiştirme talebi oluşturur.";
            s.Description = "Yeni adrese bir doğrulama anahtarı (Change Token) gönderir.";
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

        // 1. Yeni e-posta için token üret
        var token = await userManager.GenerateChangeEmailTokenAsync(user, req.NewEmail);
        
        // 2. Yeni e-postaya onay linki gönder
        var confirmLink = $"https://epiknovel.com/confirm-change-email?email={req.NewEmail}&token={Uri.EscapeDataString(token)}";
        
        await emailService.SendEmailAsync(
            req.NewEmail, 
            "Epiknovel - E-posta Değiştirme Onayı", 
            $"E-posta adresinizi güncellemek için şu linki kullanın: {confirmLink}");

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = ApiMessages.ChangeEmailLinkSent
        }), 200, ct);
    }
}

