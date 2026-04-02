using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Services;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.ForgotPassword;

[AuditLog("Şifre Sıfırlama İstendi")]
public class Endpoint(UserManager<User> userManager, IEmailService emailService) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/auth/forgot-password");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Şifre sıfırlama talebi oluşturur.";
            s.Description = "E-postaya şifre sıfırlama anahtarı gönderir (Hesap tespiti engellenmiştir).";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(req.Email);

        // Güvenlik: Kullanıcı yoksa bile başarılı mesajı dönerek hesap tespiti engellenir
        if (user != null)
        {
            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            
            // Gerçek dünyada bu token bir URL içinde e-posta ile gönderilir
            var resetLink = $"https://epiknovel.com/reset-password?email={user.Email}&token={Uri.EscapeDataString(token)}";
            
            await emailService.SendEmailAsync(
                user.Email!, 
                "Epiknovel - Şifre Sıfırlama", 
                $"Şifrenizi sıfırlamak için şu linki kullanın: {resetLink}");
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = ApiMessages.PasswordResetLinkSent
        }), 200, ct);
    }
}

