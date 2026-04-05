using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Events;
using Epiknovel.Shared.Core.Domain;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Epiknovel.Shared.Infrastructure.Logging;

public class GlobalAuditPostProcessor(IBackgroundAuditQueue queue) : IGlobalPostProcessor
{
    public async Task PostProcessAsync(IPostProcessorContext context, CancellationToken ct)
    {
        var auditAttribute = context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<AuditLogAttribute>();
        if (auditAttribute == null) return;

        var userIdString = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid? userId = Guid.TryParse(userIdString, out var parsedId) ? parsedId : null;

        var actionName = auditAttribute.ActionName ?? context.HttpContext.GetEndpoint()?.DisplayName ?? "UnknownAction";

        var moduleName = context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>()?.ControllerName 
                        ?? actionName.Split('.').FirstOrDefault() ?? "Global";

        await queue.QueueAuditEventAsync(new AuditEvent(
            UserId: userId,
            Module: moduleName,
            Action: actionName,
            EntityName: "Endpoint",
            PrimaryKeys: context.HttpContext.Request.Path,
            State: EntityState.Modified,
            IpAddress: context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent: context.HttpContext.Request.Headers.UserAgent.ToString(),
            Endpoint: context.HttpContext.Request.Path,
            Method: context.HttpContext.Request.Method,
            NewValues: context.HttpContext.Response.StatusCode.ToString(),
            TraceId: context.HttpContext.TraceIdentifier
        ));
    }
}
