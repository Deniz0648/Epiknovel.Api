using FastEndpoints;
using Epiknovel.Modules.Compliance.Features.SecureDocuments.Queries.GetStream;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;
using System.Security.Claims;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Compliance.Endpoints.SecureDocuments.Download;

public class Request
{
    public Guid Id { get; set; }
}

public class Endpoint(
    IMediator mediator,
    IPermissionService permissionService) : Endpoint<Request>
{
    public override void Configure()
    {
        Get("/compliance/documents/{id}/download");
        Summary(s => {
            s.Summary = "Gizli dokümanı stream olarak indirir.";
            s.Description = "BOLA Korumalıdır. MediatR standardı uygulanmıştır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            await Send.UnauthorizedAsync(ct);
            return;
        }

        var hasAdminAccess = await permissionService.HasPermissionAsync(User, PermissionNames.AdminAccess, ct);

        var result = await mediator.Send(new GetSecureDocumentStreamQuery(
            req.Id,
            userId,
            hasAdminAccess
        ), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(result, result.Message.Contains("yetki") ? 403 : 404, ct);
            return;
        }

        var data = result.Data!;
        await Send.StreamAsync(
            data.Stream, 
            fileName: data.FileName, 
            fileLengthBytes: null, 
            contentType: data.MimeType, 
            cancellation: ct);
    }
}
