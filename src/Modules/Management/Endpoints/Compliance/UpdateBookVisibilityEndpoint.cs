using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

public class UpdateBookVisibilityRequest
{
    public Guid BookId { get; set; }
    public bool IsVisible { get; set; }
}

[AuditLog("Update Book Visibility")]
public class UpdateBookVisibilityEndpoint(IManagementBookProvider bookProvider) : Endpoint<UpdateBookVisibilityRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/management/compliance/books/{BookId}/visibility");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateBookVisibilityRequest req, CancellationToken ct)
    {
        var success = await bookProvider.SetBookVisibilityAsync(req.BookId, req.IsVisible, ct);

        if (success)
            await Send.ResponseAsync(Result<string>.Success($"Kitap gorunurlugu {(req.IsVisible ? "aktif" : "gizli")} olarak guncellendi."), 200, ct);
        else
            await Send.ResponseAsync(Result<string>.Failure("Kitap bulunamadi veya guncellenemedi."), 404, ct);
    }
}
