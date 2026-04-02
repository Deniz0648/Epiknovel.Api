using Microsoft.AspNetCore.Identity;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Services;
using MediatR;
using System.Security.Cryptography;

namespace Epiknovel.Modules.Identity.Features.Auth.Commands.Register;

public class RegisterUserHandler(
    UserManager<User> userManager,
    IMediator mediator,
    IEmailService emailService) : IRequestHandler<RegisterUserCommand, Result<RegisterUserResponse>>
{
    public async Task<Result<RegisterUserResponse>> Handle(RegisterUserCommand request, CancellationToken ct)
    {
        var resolvedDisplayName = ResolveDisplayName(request.DisplayName);

        var user = new User
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = resolvedDisplayName,
            EmailConfirmed = false
        };

        var identityResult = await userManager.CreateAsync(user, request.Password);

        if (!identityResult.Succeeded)
        {
            var errors = string.Join(", ", identityResult.Errors.Select(e => e.Description));
            return Result<RegisterUserResponse>.Failure(errors);
        }

        // 1. Email Confirmation Token
        var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
        var encodedToken = Uri.EscapeDataString(token);
        var confirmationLink = $"{request.BaseUrl}/confirm-email?userId={user.Id}&token={encodedToken}";

        // 2. Send Email
        await emailService.SendEmailAsync(
            user.Email!, 
            "Epiknovel - Hesabınızı Onaylayın", 
            $"Kaydınızı tamamlamak için lütfen şu linke tıklayın: {confirmationLink}", 
            ct);

        // 3. Add Default Role
        await userManager.AddToRoleAsync(user, RoleNames.User);

        // 4. Cross-module event
        await mediator.Publish(new UserRegisteredEvent(user.Id, request.Email, resolvedDisplayName), ct);

        return Result<RegisterUserResponse>.Success(new RegisterUserResponse("Kayıt başarılı! Lütfen hesabınızı onaylamak için e-posta kutunuzu kontrol edin."));
    }

    private static string ResolveDisplayName(string? displayName)
    {
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            return displayName.Trim();
        }

        var suffix = RandomNumberGenerator.GetInt32(100000, 999999);
        return $"Okur {suffix}";
    }
}
