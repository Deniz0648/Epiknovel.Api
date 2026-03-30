using FastEndpoints;
using Microsoft.AspNetCore.Identity;
using MediatR;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.Register;

[AuditLog("Yeni Kayıt Oluşturuldu")]
public class Endpoint(UserManager<User> userManager, IMediator mediator) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/identity/register");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Yeni kullanıcı kaydı oluşturur.";
            s.Description = "E-posta ve şifre ile yeni bir hesap açar ve profil oluşturma sürecini tetikler.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var user = new User
        {
            UserName = req.Email,
            Email = req.Email,
            EmailConfirmed = true // Geliştirme aşamasında otomatik onaylı
        };

        var result = await userManager.CreateAsync(user, req.Password);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            await Send.ResponseAsync(Result<Response>.Failure(errors), 400, ct);
            return;
        }

        // 2. Varsayılan Rolü Ata: "User"
        await userManager.AddToRoleAsync(user, RoleNames.User);

        // 3. Modüller Arası İletişim: Profil oluşturulması için event fırlatıyoruz
        await mediator.Publish(new UserRegisteredEvent(user.Id, req.Email, req.DisplayName), ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response 
        { 
            Message = ApiMessages.UserCreatedSuccessfully 
        }), 201, ct);
    }
}

