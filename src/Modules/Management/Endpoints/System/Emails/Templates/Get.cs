using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Constants;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Endpoints.System.Emails.Templates;

public class GetRequest
{
    public Guid Id { get; set; }
}

public class Response
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Key { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Variables { get; set; } = string.Empty;
}

public class Get : Endpoint<GetRequest, Response>
{
    private readonly ManagementDbContext dbContext;
    public Get(ManagementDbContext dbContext)
    {
        this.dbContext = dbContext;
    }

    public override void Configure()
    {
        Get("/management/system/emails/templates/{Id}");
        Policies(PolicyNames.AdminAccess);
        Summary(s => s.Summary = "Get full email template details");
    }

    public override async Task HandleAsync(GetRequest req, CancellationToken ct)
    {
        var t = await dbContext.EmailTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == req.Id, ct);

        if (t == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.ResponseAsync(new Response {
            Id = t.Id,
            Name = t.Name,
            Key = t.Key,
            Subject = t.Subject,
            Body = t.Body,
            Variables = t.Variables
        }, cancellation: ct);
    }
}
