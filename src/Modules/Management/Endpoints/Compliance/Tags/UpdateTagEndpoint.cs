using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Tags;

public class UpdateTagRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
}

[AuditLog("Update Tag")]
public class UpdateTagEndpoint(IManagementBookProvider bookProvider) : Endpoint<UpdateTagRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/management/compliance/tags/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateTagRequest req, CancellationToken ct)
    {
        var success = await bookProvider.UpdateTagAsync(req.Id, req.Name, req.Slug, ct);
        if (success)
            await Send.ResponseAsync(Result<string>.Success("Etiket guncellendi."), 200, ct);
        else
            await Send.ResponseAsync(Result<string>.Failure("Etiket bulunamadi."), 404, ct);
    }
}
