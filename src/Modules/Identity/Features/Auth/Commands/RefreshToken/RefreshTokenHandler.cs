using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Identity.Domain;
using Epiknovel.Modules.Identity.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Constants;
using FastEndpoints.Security;
using MediatR;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace Epiknovel.Modules.Identity.Features.Auth.Commands.RefreshToken;

public class RefreshTokenHandler(
    UserManager<User> userManager,
    IConfiguration configuration,
    IdentityDbContext dbContext) : IRequestHandler<RefreshTokenCommand, Result<RefreshTokenResponse>>
{
    public async Task<Result<RefreshTokenResponse>> Handle(RefreshTokenCommand request, CancellationToken ct)
    {
        var strategy = dbContext.Database.CreateExecutionStrategy();

        return await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(ct);

            // 1. Find Refresh Token
            var session = await dbContext.UserSessions
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.RefreshToken == request.RefreshToken, ct);

            if (session == null || session.ExpiryDate < DateTime.UtcNow)
            {
                return Result<RefreshTokenResponse>.Failure(ApiMessages.InvalidOrExpiredSession);
            }

            var user = await userManager.FindByIdAsync(session.UserId.ToString());
            if (user == null)
            {
                return Result<RefreshTokenResponse>.Failure(ApiMessages.UserNotFound);
            }

            // Check for ban/lockout
            if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow)
            {
                await dbContext.UserSessions
                    .Where(x => x.Id == session.Id)
                    .ExecuteDeleteAsync(ct);
                await transaction.CommitAsync(ct);
                return Result<RefreshTokenResponse>.Failure(ApiMessages.Identity.UserBanned);
            }

            // 2. Token Rotation
            var jti = Guid.NewGuid().ToString();
            var deletedRows = await dbContext.UserSessions
                .Where(x => x.Id == session.Id && x.RefreshToken == request.RefreshToken)
                .ExecuteDeleteAsync(ct);

            if (deletedRows == 0)
            {
                await transaction.RollbackAsync(ct);
                return Result<RefreshTokenResponse>.Failure(ApiMessages.InvalidOrExpiredSession);
            }

            var newRefreshToken = Guid.NewGuid().ToString("N");
            var newSession = new UserSession
            {
                UserId = user.Id,
                RefreshToken = newRefreshToken,
                AccessTokenJti = jti,
                ExpiryDate = DateTime.UtcNow.AddDays(7),
                IpAddress = string.IsNullOrWhiteSpace(request.IpAddress) || request.IpAddress == "unknown" ? session.IpAddress : request.IpAddress,
                UserAgent = string.IsNullOrWhiteSpace(request.UserAgent) ? session.UserAgent : request.UserAgent
            };

            dbContext.UserSessions.Add(newSession);
            await dbContext.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            // 3. Generate New JWT (Logic outside transaction is better for performance but keeping it here for transactional safety of JTI)
            var roles = await userManager.GetRolesAsync(user);
            var expiryDate = DateTime.UtcNow.AddMinutes(60);

            var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? configuration["JWT_SECRET"]
                ?? throw new InvalidOperationException("CRITICAL: JWT_SECRET environment variable is missing!");

            var jwtToken = JwtBearer.CreateToken(o =>
            {
                o.SigningKey = jwtSecret;
                o.ExpireAt = expiryDate;
                o.User.Claims.Add(new(ClaimTypes.NameIdentifier, user.Id.ToString()));
                o.User.Claims.Add(new(ClaimTypes.Email, user.Email!));
                o.User.Claims.Add(new(JwtRegisteredClaimNames.Jti, jti));
                foreach (var role in roles)
                {
                    o.User.Claims.Add(new(ClaimTypes.Role, role));
                }
            });

            return Result<RefreshTokenResponse>.Success(new RefreshTokenResponse(jwtToken, newRefreshToken, expiryDate));
        });
    }
}
