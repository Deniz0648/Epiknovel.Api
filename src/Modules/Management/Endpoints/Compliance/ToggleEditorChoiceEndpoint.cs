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
        var success = await bookProvider.ToggleEditorChoiceAsync(req.BookId, req.IsEditorChoice, ct);

        if (success)
            await Send.ResponseAsync(Result<string>.Success($"Kitap editörün seçimi durumu {(req.IsEditorChoice ? "aktif" : "pasif")} olarak güncellendi."), 200, ct);
        else
            await Send.ResponseAsync(Result<string>.Failure("Kitap bulunamadı veya güncellenemedi."), 404, ct);
    }
}
