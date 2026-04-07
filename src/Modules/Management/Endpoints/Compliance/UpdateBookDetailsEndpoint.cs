using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

public class UpdateBookDetailsRequest
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
    public int Status { get; set; }
    public int ContentRating { get; set; }
    public string? OriginalAuthorName { get; set; }
    public List<Guid> CategoryIds { get; set; } = new();
    public List<string> Tags { get; set; } = new();
}

[AuditLog("Update Book Details")]
public class UpdateBookDetailsEndpoint(IManagementBookProvider bookProvider) : Endpoint<UpdateBookDetailsRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/management/compliance/books/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateBookDetailsRequest req, CancellationToken ct)
    {
        var success = await bookProvider.UpdateBookDetailsAsync(
            req.Id, 
            req.Title, 
            req.Description, 
            req.CoverImageUrl, 
            req.Status, 
            req.ContentRating, 
            req.OriginalAuthorName, 
            req.CategoryIds, 
            req.Tags, 
            ct);

        if (success)
            await Send.ResponseAsync(Result<string>.Success("Kitap bilgileri guncellendi."), 200, ct);
        else
            await Send.ResponseAsync(Result<string>.Failure("Kitap bulunamadi veya guncellenemedi."), 404, ct);
    }
}
