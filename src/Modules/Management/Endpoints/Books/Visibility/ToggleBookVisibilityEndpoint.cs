using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Books.Visibility;

public class ToggleBookVisibilityRequest
{
    public Guid BookId { get; set; }
    public bool IsVisible { get; set; }
}

[AuditLog("Toggle Book Visibility")]
public class ToggleBookVisibilityEndpoint(IManagementBookProvider bookProvider) : Endpoint<ToggleBookVisibilityRequest, Result<string>>
{
    public override void Configure()
    {
        Put("/management/books/{BookId}/visibility");
        Policies(PolicyNames.ModAccess);
        Summary(s =>
        {
            s.Summary = "Toggle Book Visibility";
            s.Description = "Shows or hides a book site-wide by modifying its IsHidden state. Hiding a book preserves referential integrity unlike deletion.";
            s.Responses[200] = "Visibility successfully toggled.";
            s.Responses[404] = "Book not found.";
        });
    }

    public override async Task HandleAsync(ToggleBookVisibilityRequest req, CancellationToken ct)
    {
        var success = await bookProvider.SetBookVisibilityAsync(req.BookId, req.IsVisible, ct);
        
        if (success)
        {
            var statusStr = req.IsVisible ? "Shown" : "Hidden";
            await Send.ResponseAsync(Result<string>.Success($"The book and its contents are now {statusStr}."), 200, ct);
        }
        else
        {
            await Send.ResponseAsync(Result<string>.Failure("The specified book could not be found."), 404, ct);
        }
    }
}
