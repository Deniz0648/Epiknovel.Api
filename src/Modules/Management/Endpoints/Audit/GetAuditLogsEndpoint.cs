using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Management.Endpoints.Audit;

public class GetAuditLogsRequest
{
    // Keyset/Cursor Pagination parameters
    public DateTime? Cursor { get; set; } // The CreatedAt of the last item in the previous page
    public int Take { get; set; } = 50;
    
    // Optional filters
    public Guid? UserId { get; set; }
    public string? Module { get; set; }
    public string? Action { get; set; }
}

public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Module { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class GetAuditLogsEndpoint(ManagementDbContext dbContext) : Endpoint<GetAuditLogsRequest, Result<List<AuditLogDto>>>
{
    public override void Configure()
    {
        Get("/management/audit-logs");
        Policies(PolicyNames.AdminAccess); // Viewing system logs requires high admin clearance
        Summary(s =>
        {
            s.Summary = "Get Audit Logs (Cursor Paginated)";
            s.Description = "Fetches a high-performance cursor paginated list of audit logs without calculating total counts.";
            s.Responses[200] = "Successfully retrieved audit logs.";
        });
    }

    public override async Task HandleAsync(GetAuditLogsRequest req, CancellationToken ct)
    {
        // Enforce maximum take to prevent memory exhaustion
        if (req.Take > 200) req.Take = 200;

        var query = dbContext.AuditLogs.AsNoTracking().AsQueryable();

        // Cursor Pagination Logic: Seeking strictly older logs
        if (req.Cursor.HasValue)
        {
            query = query.Where(a => a.CreatedAt < req.Cursor.Value);
        }

        // Apply dynamic filters
        if (req.UserId.HasValue)
            query = query.Where(a => a.UserId == req.UserId.Value);
            
        if (!string.IsNullOrWhiteSpace(req.Module))
            query = query.Where(a => a.Module == req.Module);
            
        if (!string.IsNullOrWhiteSpace(req.Action))
            query = query.Where(a => a.Action == req.Action);

        var logs = await query
            .OrderByDescending(a => a.CreatedAt)
            .Take(req.Take)
            .Select(a => new AuditLogDto
            {
                Id = a.Id,
                UserId = a.UserId,
                Module = a.Module,
                Action = a.Action,
                EntityName = a.EntityName,
                EntityId = a.EntityId,
                OldValues = a.OldValues,
                NewValues = a.NewValues,
                IpAddress = a.IpAddress,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<List<AuditLogDto>>.Success(logs), 200, ct);
    }
}
