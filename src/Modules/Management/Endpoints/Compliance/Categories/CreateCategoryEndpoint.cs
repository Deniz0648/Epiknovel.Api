using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Categories;

public class CreateCategoryRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public string? Slug { get; set; }
}

[AuditLog("Create Category")]
public class CreateCategoryEndpoint(IManagementBookProvider bookProvider) : Endpoint<CreateCategoryRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/compliance/categories");
        Policies(PolicyNames.ModAccess); // Changed from AdminAccess to ModAccess for consistency
    }

    public override async Task HandleAsync(CreateCategoryRequest req, CancellationToken ct)
    {
        var success = await bookProvider.CreateCategoryAsync(req.Name, req.Description, req.IconUrl, req.Slug, ct);
        if (success)
            await Send.ResponseAsync(Result<string>.Success("Kategori basariyla olusturuldu."), 201, ct);
        else
            await Send.ResponseAsync(Result<string>.Failure("Kategori olusturulamadi."), 400, ct);
    }
}
