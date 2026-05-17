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
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Modules.Identity.Endpoints.ForgotPassword;

[AuditLog("Şifre Sıfırlama İstendi")]
public class Endpoint(
    UserManager<User> userManager, 
    IEmailService emailService,
    Epiknovel.Shared.Core.Interfaces.Management.IEmailTemplateService emailTemplateService,
    IConfiguration configuration) : Endpoint<Request, Result<Response>>
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
        var normalizedBaseUrl = GetNormalizedBaseUrl(req.BaseUrl, configuration["SITE_URL"]);
        var resetLink = $"{normalizedBaseUrl}/reset-password?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(req.Email)}";

        // 📧 CENTRAL TEMPLATE: PasswordReset
        var variables = new Dictionary<string, string>
        {
            { "{UserName}", user.DisplayName ?? "Üye" },
            { "{ResetLink}", resetLink }
        };

        var (subject, body) = await emailTemplateService.GetRenderedEmailAsync("PasswordReset", variables, ct);
        await emailService.SendEmailAsync(user.Email!, subject, body, ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response { Message = "Sifre sifirlama talimati e-posta adresinize gonderildi." }), 200, ct);
    }

    private static string GetNormalizedBaseUrl(string? requestBaseUrl, string? siteBaseUrl)
    {
        static bool IsAbsoluteHttpUrl(string? value)
            => Uri.TryCreate(value, UriKind.Absolute, out var uri)
               && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);

        var selected = IsAbsoluteHttpUrl(requestBaseUrl)
            ? requestBaseUrl!
            : IsAbsoluteHttpUrl(siteBaseUrl)
                ? siteBaseUrl!
                : "https://test.epiknovel.com";

        return selected.TrimEnd('/');
    }
}
