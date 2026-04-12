using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Services;
using Epiknovel.Shared.Core.Attributes;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Epiknovel.Modules.Identity.Endpoints.ForgotPassword;

[AuditLog("Şifre Sıfırlama İstendi")]
public class Endpoint(
    UserManager<User> userManager, 
    IEmailService emailService,
    Epiknovel.Shared.Core.Interfaces.Management.IEmailTemplateService emailTemplateService) : Endpoint<Request, Result<Response>>
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
        if (user == null)
        {
            // Security: Don't reveal account doesn't exist
            await Send.ResponseAsync(Result<Response>.Success(new Response { Message = "Sifre sifirlama talimati e-posta adresinize gonderildi." }), 200, ct);
            return;
        }

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var resetLink = $"{req.BaseUrl}/auth/reset-password?token={Uri.EscapeDataString(token)}&email={req.Email}";

        // 📧 CENTRAL TEMPLATE: ResetPassword
        var variables = new Dictionary<string, string>
        {
            { "{USER_NAME}", user.DisplayName ?? "Üye" },
            { "{RESET_LINK}", resetLink },
            { "{RESET_URL}", resetLink }
        };

        var (subject, body) = await emailTemplateService.GetRenderedEmailAsync("ResetPassword", variables, ct);
        await emailService.SendEmailAsync(user.Email!, subject, body);

        await Send.ResponseAsync(Result<Response>.Success(new Response { Message = "Sifre sifirlama talimati e-posta adresinize gonderildi." }), 200, ct);
    }
}
