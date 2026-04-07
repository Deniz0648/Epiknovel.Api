using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Categories;

public class UpdateCategoryRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public string? Slug { get; set; }
}

[AuditLog("Update Category")]
public class UpdateCategoryEndpoint(IManagementBookProvider bookProvider) : Endpoint<UpdateCategoryRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/management/compliance/categories/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateCategoryRequest req, CancellationToken ct)
    {
        var success = await bookProvider.UpdateCategoryAsync(req.Id, req.Name, req.Description, req.IconUrl, req.Slug, ct);
        if (success)
            await Send.ResponseAsync(Result<string>.Success("Kategori guncellendi."), 200, ct);
        else
            await Send.ResponseAsync(Result<string>.Failure("Kategori bulunamadi."), 404, ct);
    }
}
