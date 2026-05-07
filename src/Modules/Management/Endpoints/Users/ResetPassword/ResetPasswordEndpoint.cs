using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Users.ResetPassword;

public record ResetPasswordRequest
{
    public Guid UserId { get; init; }
}

public class ResetPasswordEndpoint(IManagementUserProvider userProvider) : Endpoint<ResetPasswordRequest, Result<string>>
{
    public override void Configure()
    {
        Post("/management/users/{UserId}/reset-password");
        Policies(PolicyNames.AdminAccess);
        Summary(s =>
        {
            s.Summary = "Trigger password reset for a user";
            s.Description = "Generates a reset token and fires an event to send a reset email.";
        });
    }

    public override async Task HandleAsync(ResetPasswordRequest req, CancellationToken ct)
    {
        var success = await userProvider.TriggerPasswordResetAsync(req.UserId, ct);
        if (success)
        {
            await Send.ResponseAsync(Result<string>.Success("Şifre sıfırlama e-postası tetiklendi."), 200, ct);
        }
        else
        {
            await Send.ResponseAsync(Result<string>.Failure("Şifre sıfırlama tetiklenemedi. Yetki yetersiz veya kullanıcı bulunamadı."), 400, ct);
        }
    }
}
