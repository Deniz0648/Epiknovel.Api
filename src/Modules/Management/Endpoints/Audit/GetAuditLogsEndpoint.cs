using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Shared.Core.Constants;
using AuditEntityState = Epiknovel.Shared.Core.Domain.EntityState;

namespace Epiknovel.Modules.Management.Endpoints.Audit;

public class GetAuditLogsRequest
{
    public DateTime? Cursor { get; set; }
    public int Take { get; set; } = 50;
    
    public Guid? UserId { get; set; }
    public string? Module { get; set; }
    public string? Action { get; set; }
    public string? TraceId { get; set; }
    public AuditEntityState? State { get; set; }
}

public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Module { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? PrimaryKeys { get; set; }
    public AuditEntityState State { get; set; }
    public string? OldValues { get; set; }
    public string? NewValues { get; set; }
    public string? ChangedColumns { get; set; }
    public string? IpAddress { get; set; }
    public string? Endpoint { get; set; }
    public string? Method { get; set; }
    public string? TraceId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class GetAuditLogsEndpoint(ManagementDbContext dbContext) : Endpoint<GetAuditLogsRequest, Result<List<AuditLogDto>>>
{
    public override void Configure()
    {
        Get("/management/audit-logs");
        Policies(PolicyNames.AdminAccess);
        Summary(s =>
        {
            s.Summary = "Get Audit Logs (Cursor Paginated)";
            s.Description = "Fetches a high-performance cursor paginated list of audit logs without calculating total counts.";
            s.Responses[200] = "Successfully retrieved audit logs.";
        });
    }

    public override async Task HandleAsync(GetAuditLogsRequest req, CancellationToken ct)
    {
        if (req.Take > 200) req.Take = 200;

        var query = dbContext.AuditLogs.AsNoTracking().AsQueryable();

        if (req.Cursor.HasValue)
            query = query.Where(a => a.CreatedAt < req.Cursor.Value);

        if (req.UserId.HasValue)
            query = query.Where(a => a.UserId == req.UserId.Value);
            
        if (!string.IsNullOrWhiteSpace(req.Module))
            query = query.Where(a => a.Module == req.Module);
            
        if (!string.IsNullOrWhiteSpace(req.Action))
            query = query.Where(a => a.Action == req.Action);

        if (!string.IsNullOrWhiteSpace(req.TraceId))
            query = query.Where(a => a.TraceId == req.TraceId);

        if (req.State.HasValue)
            query = query.Where(a => a.State == req.State.Value);

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
                PrimaryKeys = a.PrimaryKeys,
                State = a.State,
                OldValues = a.OldValues,
                NewValues = a.NewValues,
                ChangedColumns = a.ChangedColumns,
                IpAddress = a.IpAddress,
                Endpoint = a.Endpoint,
                Method = a.Method,
                TraceId = a.TraceId,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(Result<List<AuditLogDto>>.Success(logs), 200, ct);
    }
}
