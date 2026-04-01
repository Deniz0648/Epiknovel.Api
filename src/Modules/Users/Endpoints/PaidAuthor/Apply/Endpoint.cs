using FastEndpoints;
using Microsoft.AspNetCore.Http;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Models;
using System.Security.Claims;

namespace Epiknovel.Modules.Users.Endpoints.PaidAuthor.Apply;

public record Request
{
    public IFormFile ExemptionCertificate { get; init; } = null!;
    public IFormFile BankDocument { get; init; } = null!;
    public string Iban { get; init; } = string.Empty;
    public string BankName { get; init; } = string.Empty;
}

public class Endpoint(
    IAuthorApplicationService authorApplicationService,
    IFileService fileService) : Endpoint<Request, Result<string>>
{
    public override void Configure()
    {
        Post("/paid-author/apply");
        Policies("BOLA");
        AllowFileUploads();
        Throttle(3, 60);
        Summary(s =>
        {
            s.Summary = "Ücretli yazarlık başvurusu yap.";
            s.Description = "Kullanıcının belge yükleyerek ücretli yazarlık başvurusu oluşturmasını sağlar.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdString, out var userId))
        {
            await Send.ResponseAsync(Result<string>.Failure("Unauthorized"), 401, ct);
            return;
        }

        try
        {
            var certUrl = await fileService.SaveSecureDocumentAsync(req.ExemptionCertificate, "author_documents");
            var bankUrl = await fileService.SaveSecureDocumentAsync(req.BankDocument, "author_documents");

            var result = await authorApplicationService.SubmitPaidAuthorApplicationAsync(
                userId,
                certUrl,
                bankUrl,
                req.Iban,
                req.BankName,
                ct);

            if (!result.IsSuccess)
            {
                await Send.ResponseAsync(result, 400, ct);
                return;
            }

            await Send.ResponseAsync(result, 200, ct);
        }
        catch (Exception ex)
        {
            await Send.ResponseAsync(Result<string>.Failure($"Başvuru sırasında hata oluştu: {ex.Message}"), 500, ct);
        }
    }
}
