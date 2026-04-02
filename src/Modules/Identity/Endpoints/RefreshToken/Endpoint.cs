using FastEndpoints;
using Epiknovel.Modules.Identity.Features.Auth.Commands.RefreshToken;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Identity.Endpoints.RefreshToken;

public class Endpoint(IMediator mediator) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/auth/refresh-token");
        AllowAnonymous();
        Summary(s => {
            s.Summary = "Access Token'ı yeniler.";
            s.Description = "Geçerli bir Refresh Token ile yeni bir JWT ve yeni bir Refresh Token üretir. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var result = await mediator.Send(new RefreshTokenCommand(
            req.RefreshToken,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            HttpContext.Request.Headers.UserAgent.ToString()
        ), ct);

        if (!result.IsSuccess)
        {
            var statusCode = result.Message.Contains("banned") || result.Message.Contains("yasaklandı") ? 403 : 401;
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), statusCode, ct);
            return;
        }

        var data = result.Data!;
        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            AccessToken = data.AccessToken,
            RefreshToken = data.RefreshToken,
            ExpiryDate = data.ExpiryDate
        }), 200, ct);
    }
}
