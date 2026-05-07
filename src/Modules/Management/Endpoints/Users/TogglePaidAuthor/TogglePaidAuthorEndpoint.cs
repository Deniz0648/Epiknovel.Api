using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Users.TogglePaidAuthor;

public record TogglePaidAuthorRequest
{
    public Guid UserId { get; init; }
    public bool Status { get; init; }
}

public class TogglePaidAuthorEndpoint(IManagementUserProvider userProvider) : Endpoint<TogglePaidAuthorRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/users/{UserId}/toggle-paid-author");
        Policies(PolicyNames.AdminAccess);
        Summary(s =>
        {
            s.Summary = "Toggle paid author status for a user";
            s.Description = "Enables or disables the user's ability to earn tokens and publish paid content.";
        });
    }

    public override async Task HandleAsync(TogglePaidAuthorRequest req, CancellationToken ct)
    {
        var success = await userProvider.TogglePaidAuthorAsync(req.UserId, req.Status, ct);
        if (success)
        {
            await Send.ResponseAsync(Result<string>.Success("Ücretli yazarlık yetkisi güncellendi."), 200, ct);
        }
        else
        {
            await Send.ResponseAsync(Result<string>.Failure("Yetki güncellenemedi. Yetki yetersiz veya kullanıcı bulunamadı."), 400, ct);
        }
    }
}
