using FastEndpoints;
using MediatR;
using Microsoft.AspNetCore.Http;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Events;
using System.Security.Claims;
using System.Reflection;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace Epiknovel.Shared.Infrastructure.Logging;

public class GlobalAuditPostProcessor(IBackgroundAuditQueue queue) : IGlobalPostProcessor
{
    public async Task PostProcessAsync(IPostProcessorContext context, CancellationToken ct)
    {
        // 1. Endpoint üzerinde [AuditLog] etiketi var mı kontrol et
        var auditAttribute = context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<AuditLogAttribute>();
        
        if (auditAttribute == null) return;

        // 2. Kullanıcı bilgilerini topla
        var userIdString = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
        Guid.TryParse(userIdString, out var userId); // Giriş yapmamış olabilir (Register durumunda)

        // 3. Aksiyon adını belirle (Attribute'dan veya Endpoint adından)
        var actionName = auditAttribute.ActionName ?? context.HttpContext.GetEndpoint()?.DisplayName ?? "UnknownAction";

        // 4. Modül ismini bul (Namespace'den süzüyoruz)
        var moduleName = context.HttpContext.GetEndpoint()?.Metadata.GetMetadata<ControllerActionDescriptor>()?.ControllerName 
                        ?? actionName.Split('.').FirstOrDefault() ?? "Global";

        // 5. Audit Event'i kuyruğa ekle (Asenkron - İstek bloklanmaz)
        await queue.QueueAuditEventAsync(new AuditEvent(
            UserId: userId,
            Module: moduleName,
            Action: actionName,
            EntityName: "Endpoint",
            EntityId: context.HttpContext.Request.Path,
            IpAddress: context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            UserAgent: context.HttpContext.Request.Headers.UserAgent.ToString(),
            Endpoint: context.HttpContext.Request.Path,
            Method: context.HttpContext.Request.Method,
            NewValues: context.HttpContext.Response.StatusCode.ToString() // Durum kodunu NewValues olarak mühürlüyoruz
        ));
    }
}
