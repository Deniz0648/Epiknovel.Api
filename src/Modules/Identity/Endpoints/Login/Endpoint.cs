using FastEndpoints;
using Epiknovel.Modules.Identity.Features.Auth.Commands.Login;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Shared.Core.Attributes;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Identity.Endpoints.Login;

[AuditLog("Giriş Yapıldı")]
public class Endpoint(IMediator mediator) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/auth/login");
        AllowAnonymous();
        Throttle(6, 60); // Brute-force protection
        Summary(s => {
            s.Summary = "Kullanıcı girişi yapar.";
            s.Description = "E-posta ve şifre ile JWT, Refresh Token ve Profil bilgilerini döner. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var result = await mediator.Send(new LoginCommand(
            req.Email,
            req.Password,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            HttpContext.Request.Headers.UserAgent.ToString()
        ), ct);

        if (!result.IsSuccess)
        {
            var statusCode = result.Message.Contains("kilitlenmiştir") ? 403 : 400;
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), statusCode, ct);
            return;
        }

        var data = result.Data!;
        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            AccessToken = data.AccessToken,
            RefreshToken = data.RefreshToken,
            ExpiryDate = data.ExpiryDate,
            Profile = data.Profile
        }), 200, ct);
    }
}
