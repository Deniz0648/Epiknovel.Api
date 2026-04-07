using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Tags;

public class CreateTagRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
}

[AuditLog("Create Tag")]
public class CreateTagEndpoint(IManagementBookProvider bookProvider) : Endpoint<CreateTagRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/compliance/tags");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CreateTagRequest req, CancellationToken ct)
    {
        var success = await bookProvider.CreateTagAsync(req.Name, req.Slug, ct);
        if (success)
            await Send.ResponseAsync(Result<string>.Success("Etiket basariyla olusturuldu."), 201, ct);
        else
            await Send.ResponseAsync(Result<string>.Failure("Etiket olusturulamadi."), 400, ct);
    }
}
