using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

[AuditLog("Delete Management Book")]
public class DeleteManagementBookEndpoint(IManagementBookProvider bookProvider) : EndpointWithoutRequest<Epiknovel.Shared.Core.Models.Result<string>>
{
    private readonly IManagementBookProvider _bookProvider = bookProvider;

    public override void Configure()
    {
        Delete("/management/compliance/books/{Id}");
        Policies(PolicyNames.AdminAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<Guid>("Id");
        var success = await _bookProvider.DeleteBookAsync(id, ct);
        
        if (success)
            await Send.ResponseAsync(Epiknovel.Shared.Core.Models.Result<string>.Success("Kitap silindi (soft-delete)."), 200, ct);
        else
            await Send.ResponseAsync(Epiknovel.Shared.Core.Models.Result<string>.Failure("Kitap bulunamadi."), 404, ct);
    }
}
