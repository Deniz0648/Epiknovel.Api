using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

[AuditLog("View Book Details")]
public class GetBookDetailsEndpoint(IManagementBookProvider bookProvider) : EndpointWithoutRequest<Result<ManagementBookDetailsDto>>
{
    public override void Configure()
    {
        Get("/management/compliance/books/{Id}");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<Guid>("Id");
        var details = await bookProvider.GetBookDetailsAsync(id, ct);
        if (details == null)
        {
            await Send.ResponseAsync(Result<ManagementBookDetailsDto>.Failure("Kitap bulunamadi."), 404, ct);
            return;
        }

        await Send.ResponseAsync(Result<ManagementBookDetailsDto>.Success(details), 200, ct);
    }
}
