using System.Security.Claims;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Shared.Core.Commands.Identity;
using Epiknovel.Shared.Core.Models;
using FastEndpoints.Security;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace Epiknovel.Modules.Identity.Handlers;

public class GenerateImpersonationTokenCommandHandler(
    UserManager<User> userManager,
    IConfiguration configuration) : IRequestHandler<GenerateImpersonationTokenCommand, Result<string>>
{
    public async Task<Result<string>> Handle(GenerateImpersonationTokenCommand request, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(request.TargetUserId.ToString());
        if (user == null) return Result<string>.Failure("Target user not found.");

        var roles = await userManager.GetRolesAsync(user);

        var token = JwtBearer.CreateToken(o =>
        {
            o.SigningKey = configuration["JWT_SECRET"] ?? "super-secret-key-2026";
            o.ExpireAt = DateTime.UtcNow.AddHours(1); // Usually shorter duration for impersonation
            
            o.User.Claims.Add(new("sub", user.Id.ToString()));
            o.User.Claims.Add(new("email", user.Email!));
            o.User.Claims.Add(new("IsImpersonated", "true"));
            o.User.Claims.Add(new("ImpersonatedBy", request.ActorAdminId.ToString()));
            
            foreach (var role in roles)
            {
                o.User.Claims.Add(new(ClaimTypes.Role, role));
            }
        });

        return Result<string>.Success(token);
    }
}
