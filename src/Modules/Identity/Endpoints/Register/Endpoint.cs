using FastEndpoints;
using Microsoft.AspNetCore.Http;
using MediatR;
using Epiknovel.Modules.Identity.Features.Auth.Commands.Register;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Identity.Endpoints.Register;

[AuditLog("Yeni Kayıt Oluşturuldu")]
public class Endpoint(IMediator mediator) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/auth/register");
        AllowAnonymous();
        Throttle(3, 60); // 1 dakikada 3 kayıt denemesi (Spam ve BOT koruması)
        Summary(s => {
            s.Summary = "Yeni kullanıcı kaydı oluşturur.";
            s.Description = "E-posta onaylı olmayan bir hesap açar ve doğrulama linki gönderir. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var baseUrl = $"{HttpContext.Request.Scheme}://{HttpContext.Request.Host}";
        
        var result = await mediator.Send(new RegisterUserCommand(
            req.Email,
            req.Password,
            req.DisplayName,
            baseUrl
        ), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response 
        { 
            Message = result.Data!.Message
        }), 201, ct);
    }
}
