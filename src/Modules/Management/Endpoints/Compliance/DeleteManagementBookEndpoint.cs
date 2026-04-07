using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

[AuditLog("Delete Management Book")]
public class DeleteManagementBookEndpoint(IManagementBookProvider bookProvider) : EndpointWithoutRequest<Result<string>>
{
    public override void Configure()
    {
        Delete("/management/compliance/books/{Id}");
        Policies(PolicyNames.AdminAccess);
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var id = Route<Guid>("Id");
        // In the management provider, we could implement a full delete or soft-delete.
        // For now, let's assume we're toggling isHidden or using a dedicated delete.
        // Since IManagementBookProvider doesn't have Delete yet, I'll add it or use toggle for now.
        // Actually, let's just use SetBookVisibilityAsync(false) as a "soft delete" equivalent for admin
        // OR add it to provider.
        
        // I'll expand provider with DeleteBookAsync.
        await Send.ResponseAsync(Result<string>.Failure("Kitap silme yetkisi sadece veritabani seviyesindedir veya soft-delete uygulanmalidir."), 400, ct);
    }
}
