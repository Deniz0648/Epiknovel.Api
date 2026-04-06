using FastEndpoints;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Shared.Infrastructure.Monitoring;

/// <summary>
/// Bu PreProcessor, isteğin gerçekten Handler'a ulaştığını işaretler.
/// OutputCache middleware'i eğer bir HIT dönerse bu PreProcessor'ı (ve Handler'ı) asla çalıştırmaz.
/// Bu sayede "X-Cache: Hit/Miss" tespiti yapabiliriz.
/// </summary>
public class ActionPreProcessor : IGlobalPreProcessor
{
    public Task PreProcessAsync(IPreProcessorContext context, CancellationToken ct)
    {
        // İstek Handler'a ulaştıysa işaretle
        context.HttpContext.Items["HandlerReached"] = true;
        return Task.CompletedTask;
    }
}
