using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance.Tags;

[AuditLog("Delete Tag")]
public class DeleteTagEndpoint(IManagementBookProvider bookProvider) : EndpointWithoutRequest<Result<string>>
{
    public override void Configure()
    {
        Delete("/management/compliance/tags/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<Guid>("Id");
        var success = await bookProvider.DeleteTagAsync(id, ct);
        if (success)
            await Send.ResponseAsync(Result<string>.Success("Etiket basariyla silindi."), 200, ct);
        else
            await Send.ResponseAsync(Result<string>.Failure("Etiket bulunamadi."), 404, ct);
    }
}
