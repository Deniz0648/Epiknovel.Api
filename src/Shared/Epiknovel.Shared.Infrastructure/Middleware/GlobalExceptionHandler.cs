using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Diagnostics;
using System.Text.Json;
using Epiknovel.Shared.Core.Models;

namespace Epiknovel.Shared.Infrastructure.Middleware;

public class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        logger.LogError(exception, "Beklenmedik bir hata oluştu: {Message}", exception.Message);

        var result = Result<object>.Failure("Sunucuda beklenmedik bir sorun oluştu. Lütfen daha sonra tekrar deneyiniz.");

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        httpContext.Response.ContentType = "application/json";

        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(result), cancellationToken);

        return true; // Hata işlendi!
    }
}
