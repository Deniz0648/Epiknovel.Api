using Epiknovel.Modules.Social.Data;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Endpoints.Admin.Comments;

public class UpdateSocialVisibilityRequest
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty; // review, comment, inline
    public bool IsHidden { get; set; }
}

[AuditLog("Update Social Content Visibility")]
public class UpdateSocialContentVisibilityEndpoint(SocialDbContext dbContext) : Endpoint<UpdateSocialVisibilityRequest, Epiknovel.Shared.Core.Models.Result<string>>
{
    public override void Configure()
    {
        Put("/social/admin/content/visibility");
        Policies(PolicyNames.ModAccess);
    }

    public override async Task HandleAsync(UpdateSocialVisibilityRequest req, CancellationToken ct)
    {
        if (req.Type == "review")
        {
            var item = await dbContext.Reviews.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == req.Id, ct);
            if (item != null)
            {
                item.IsHidden = req.IsHidden;
            }
        }
        else if (req.Type == "comment")
        {
            var item = await dbContext.Comments.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == req.Id, ct);
            if (item != null)
            {
                item.IsHidden = req.IsHidden;
            }
        }
        else if (req.Type == "inline")
        {
            var item = await dbContext.InlineComments.IgnoreQueryFilters().FirstOrDefaultAsync(x => x.Id == req.Id, ct);
            if (item != null)
            {
                item.IsHidden = req.IsHidden;
            }
        }
        else
        {
             await Send.ResponseAsync(Result<string>.Failure("Geçersiz tip"), 400, ct);
             return;
        }

        await dbContext.SaveChangesAsync(ct);
        await Send.ResponseAsync(Result<string>.Success("Görünürlük başarıyla güncellendi."), 200, ct);
    }
}
