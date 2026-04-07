using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

public class CreateTranslatedBookRequest
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public int Status { get; set; }
    public int ContentRating { get; set; }
    public string OriginalAuthorName { get; set; } = string.Empty;
    public List<Guid> CategoryIds { get; set; } = new();
    public List<string> Tags { get; set; } = new();
}

[AuditLog("Create Translated Book")]
public class CreateTranslatedBookEndpoint(
    IManagementBookProvider bookProvider, 
    IManagementUserProvider userProvider) : Endpoint<CreateTranslatedBookRequest, Result<Guid>>
{
    public override void Configure()
    {
        Post("/management/compliance/books/translated");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CreateTranslatedBookRequest req, CancellationToken ct)
    {
        var superAdminId = await userProvider.GetSuperAdminIdAsync(ct);
        if (!superAdminId.HasValue)
        {
            await Send.ResponseAsync(Result<Guid>.Failure("Sistemde SuperAdmin bulunamadigi icin cevirilen eser eklenemez."), 400, ct);
            return;
        }

        var bookId = await bookProvider.CreateTranslatedBookAsync(
            superAdminId.Value, 
            req.Title, 
            req.Description, 
            req.CoverImageUrl, 
            req.Status, 
            req.ContentRating, 
            req.OriginalAuthorName, 
            req.CategoryIds, 
            req.Tags, 
            ct);

        await Send.ResponseAsync(Result<Guid>.Success(bookId, "Cevrilen eser basariyla eklendi."), 201, ct);
    }
}
