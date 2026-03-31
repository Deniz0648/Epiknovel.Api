using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using MediatR;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Attributes;

using Epiknovel.Shared.Core.Services;
using System.Security.Cryptography;

namespace Epiknovel.Modules.Identity.Endpoints.Register;

[AuditLog("Yeni Kayıt Oluşturuldu")]
public class Endpoint(
    UserManager<User> userManager, 
    IMediator mediator,
    IEmailService emailService) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/register");
        AllowAnonymous();
        Throttle(3, 60); // 1 dakikada 3 kayıt denemesi (Spam ve BOT koruması)
        Summary(s => {
            s.Summary = "Yeni kullanıcı kaydı oluşturur.";
            s.Description = "E-posta onaylı olmayan bir hesap açar ve doğrulama linki gönderir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var resolvedDisplayName = ResolveDisplayName(req.DisplayName);

        var user = new User
        {
            UserName = req.Email,
            Email = req.Email,
            DisplayName = resolvedDisplayName,
            EmailConfirmed = false // E-posta onayı zorunlu hale getirildi
        };

        var result = await userManager.CreateAsync(user, req.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            await Send.ResponseAsync(Result<Response>.Failure(errors), 400, ct);
            return;
        }

        // 1. E-posta Onay Token'ı ve Linki Oluştur
        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var confirmationLink = BuildConfirmationLink(HttpContext.Request, user.Id, token);

        // 2. Onay E-postası Gönder
        await emailService.SendEmailAsync(
            user.Email!, 
            "Epiknovel - Hesabınızı Onaylayın", 
            $"Kaydınızı tamamlamak için lütfen şu linke tıklayın: {confirmationLink}", 
            ct);

        // 3. Varsayılan Rolü Ata: "User"
        await userManager.AddToRoleAsync(user, RoleNames.User);

        // 4. Modüller Arası İletişim: Profil oluşturulması için event fırlatıyoruz
        await mediator.Publish(new UserRegisteredEvent(user.Id, req.Email, resolvedDisplayName), ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response 
        { 
            Message = "Kayıt başarılı! Lütfen hesabınızı onaylamak için e-posta kutunuzu kontrol edin." 
        }), 201, ct);
    }

    private static string BuildConfirmationLink(HttpRequest request, Guid userId, string token)
    {
        var encodedToken = Uri.EscapeDataString(token);
        var baseUrl = $"{request.Scheme}://{request.Host}";
        return $"{baseUrl}/confirm-email?userId={userId}&token={encodedToken}";
    }

    private static string ResolveDisplayName(string? displayName)
    {
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            return displayName.Trim();
        }

        // E-posta veya kullanıcı kimliği sızıntısı olmadan güvenli varsayılan üret.
        var suffix = RandomNumberGenerator.GetInt32(100000, 999999);
        return $"Okur {suffix}";
    }
}

