using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Compliance;

public class ToggleEditorChoiceRequest
{
    public Guid BookId { get; set; }
    public bool IsEditorChoice { get; set; }
    public DateTime? ExpectedUpdatedAt { get; set; }
}

[AuditLog("Toggle Editor Choice")]
public class ToggleEditorChoiceEndpoint(IManagementBookProvider bookProvider) : Endpoint<ToggleEditorChoiceRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/management/compliance/books/{BookId}/editor-choice");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(ToggleEditorChoiceRequest req, CancellationToken ct)
    {
        var routeBookId = Route<Guid>("BookId");
        if (routeBookId == Guid.Empty || req.BookId == Guid.Empty || routeBookId != req.BookId)
        {
            await Send.ResponseAsync(Result<string>.Failure("Route BookId ve payload BookId eslesmiyor."), 400, ct);
            return;
        }

        var success = await bookProvider.ToggleEditorChoiceAsync(req.BookId, req.IsEditorChoice, req.ExpectedUpdatedAt, ct);

        if (success)
            await Send.ResponseAsync(Result<string>.Success($"Kitap editörün seçimi durumu {(req.IsEditorChoice ? "aktif" : "pasif")} olarak güncellendi."), 200, ct);
        else
            await Send.ResponseAsync(Result<string>.Failure("Kayit degisti. Lutfen yenileyip tekrar deneyin."), 409, ct);
    }
}
