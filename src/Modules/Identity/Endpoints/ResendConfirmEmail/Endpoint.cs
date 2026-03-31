using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Services;

namespace Epiknovel.Modules.Identity.Endpoints.ResendConfirmEmail;

[AuditLog("E-posta Onay Baglantisi Tekrar Gonderildi")]
public class Endpoint(
    UserManager<User> userManager,
    IEmailService emailService) : EndpointWithoutRequest<Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/confirm-email/resend");
        Policies("BOLA");
        Throttle(3, 60);
        Summary(s =>
        {
            s.Summary = "Giris yapmis kullanici icin e-posta onay baglantisini yeniden gonderir.";
            s.Description = "Hesabi henuz onaylanmamis kullanicilara yeni bir dogrulama linki yollar.";
        });
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var userId = User.FindFirstValue("sub") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kullanici bulunamadi."), 401, ct);
            return;
        }

        var user = await userManager.FindByIdAsync(userId);
        if (user is null || string.IsNullOrWhiteSpace(user.Email))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kullanici bulunamadi."), 404, ct);
            return;
        }

        if (user.EmailConfirmed)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Bu hesap zaten onaylanmis."), 400, ct);
            return;
        }

        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var confirmationLink = BuildConfirmationLink(HttpContext.Request, user.Id, token);

        await emailService.SendEmailAsync(
            user.Email,
            "Epiknovel - Hesabinizi Onaylayin",
            $"Kaydinizi tamamlamak icin lutfen su linke tiklayin: {confirmationLink}",
            ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Yeni onay baglantisi e-posta adresinize gonderildi."
        }), 200, ct);
    }

    private static string BuildConfirmationLink(HttpRequest request, Guid userId, string token)
    {
        var encodedToken = Uri.EscapeDataString(token);
        var baseUrl = $"{request.Scheme}://{request.Host}";
        return $"{baseUrl}/confirm-email?userId={userId}&token={encodedToken}";
    }
}
