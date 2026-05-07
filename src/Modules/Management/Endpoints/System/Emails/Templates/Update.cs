using FastEndpoints;
using Epiknovel.Modules.Management.Data;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Management.Endpoints.System.Emails.Templates;

public class UpdateRequest
{
    public Guid Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public class Update(ManagementDbContext dbContext) : Endpoint<UpdateRequest, Result<bool>>
{
    public override void Configure()
    {
        Put("/management/system/emails/templates/{Id}");
        Policies(PolicyNames.AdminAccess);
        Summary(s => s.Summary = "Update an email template");
    }

    public override async Task HandleAsync(UpdateRequest req, CancellationToken ct)
    {
        var template = await dbContext.EmailTemplates.FirstOrDefaultAsync(x => x.Id == req.Id, ct);
        
        if (template == null)
        {
            await Send.ResponseAsync(Result<bool>.Failure("Template not found"), 404, ct);
            return;
        }

        template.Subject = req.Subject;
        template.Body = req.Body;
        template.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync(ct);
        await Send.ResponseAsync(Result<bool>.Success(true), 200, ct);
    }
}
