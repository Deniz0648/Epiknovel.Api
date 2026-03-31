using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Constants;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Endpoints.System.Emails.Templates;

public class ApiResponse
{
    public List<TemplateSummary> Items { get; set; } = [];
}

public class TemplateSummary
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Variables { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class List : EndpointWithoutRequest<ApiResponse>
{
    private readonly ManagementDbContext dbContext;
    public List(ManagementDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    public override void Configure()
    {
        Get("/management/system/emails/templates");
        Policies(PolicyNames.AdminAccess);
        Summary(s => s.Summary = "List all email templates");
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var templates = await dbContext.EmailTemplates
            .AsNoTracking()
            .Select(t => new TemplateSummary {
                Id = t.Id,
                Name = t.Name,
                Key = t.Key,
                Subject = t.Subject,
                Variables = t.Variables,
                IsActive = t.IsActive
            })
            .ToListAsync(ct);

        await Send.ResponseAsync(new ApiResponse { Items = templates }, cancellation: ct);
    }
}
