using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces.Management;
using Epiknovel.Shared.Core.Models;
using FastEndpoints;

namespace Epiknovel.Modules.Management.Endpoints.Comments.List;

public record GetCommentsRequest
{
    public DateTime? Cursor { get; init; }
    public int Take { get; init; } = 50;
    public Guid? BookId { get; init; }
    public Guid? UserId { get; init; }
}

public class GetCommentsEndpoint(IManagementSocialProvider socialProvider) : Endpoint<GetCommentsRequest, Result<List<CommentManagementDto>>>
{
    public override void Configure()
    {
        Get("/management/comments");
        Policies(PolicyNames.ModAccess);
        Summary(s =>
        {
            s.Summary = "Get comments (Cursor Paginated)";
            s.Description = "Returns a paginated list of comments for moderation.";
        });
    }

    public override async Task HandleAsync(GetCommentsRequest req, CancellationToken ct)
    {
        var take = Math.Min(req.Take, 100);
        var comments = await socialProvider.GetPaginatedCommentsAsync(req.Cursor, take, req.BookId, req.UserId, ct);
        
        await Send.ResponseAsync(Result<List<CommentManagementDto>>.Success(comments), 200, ct);
    }
}
