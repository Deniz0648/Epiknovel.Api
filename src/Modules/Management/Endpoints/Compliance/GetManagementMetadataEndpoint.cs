using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

public record ManagementMetadataResponse(List<ManagementSimpleDto> Categories, List<ManagementSimpleDto> Tags);

[AuditLog("View Management Metadata")]
public class GetManagementMetadataEndpoint(IManagementBookProvider bookProvider) : EndpointWithoutRequest<Result<ManagementMetadataResponse>>
{
    public override void Configure()
    {
        Get("/management/compliance/metadata");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var categories = await bookProvider.GetCategoriesAsync(ct);
        var tags = await bookProvider.GetTagsAsync(ct);
        
        await Send.ResponseAsync(Result<ManagementMetadataResponse>.Success(new ManagementMetadataResponse(categories, tags)), 200, ct);
    }
}
