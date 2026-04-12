using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Support.GetTicket;

public class Endpoint(ManagementDbContext dbContext, IUserAccountProvider userAccountProvider) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Get("/management/support/tickets/{Id}");
        Policies("BOLA");
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var ticket = await dbContext.SupportTickets
            .Include(x => x.Messages)
            .FirstOrDefaultAsync(x => x.Id == req.Id, ct);

        if (ticket == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        // BOLA: Authorized to view if owner or admin
        bool isAdmin = User.HasClaim(c => c.Type == global::System.Security.Claims.ClaimTypes.Role && (c.Value == "Admin" || c.Value == "SuperAdmin"));
        if (ticket.UserId != req.UserId && !isAdmin)
        {
            await Send.ForbiddenAsync(ct);
            return;
        }

        var userIds = ticket.Messages.Select(m => m.UserId).Distinct().ToArray();
        var displayNames = await userAccountProvider.GetDisplayNamesAsync(userIds, ct);

        var response = new Response
        {
            Id = ticket.Id,
            Title = ticket.Title,
            Category = ticket.Category,
            Description = ticket.Description,
            Status = ticket.Status,
            CreatedAt = ticket.CreatedAt,
            Messages = ticket.Messages.OrderBy(m => m.CreatedAt).Select(m => new MessageDto
            {
                Id = m.Id,
                UserId = m.UserId,
                UserDisplayName = displayNames.GetValueOrDefault(m.UserId, "Kullanıcı"),
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsAdminResponse = m.IsAdminResponse
            }).ToList()
        };

        await Send.ResponseAsync(Result<Response>.Success(response), 200, ct);
    }
}
