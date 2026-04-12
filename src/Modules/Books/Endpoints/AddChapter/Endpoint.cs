using FastEndpoints;
using Epiknovel.Modules.Books.Features.Chapters.Commands.AddChapter;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Interfaces;
using Epiknovel.Shared.Core.Attributes;

namespace Epiknovel.Modules.Books.Endpoints.AddChapter;

[AuditLog("Bölüm Yayınlandı (Satır Bazlı)")]
public class Endpoint(IMediator mediator, IPermissionService permissionService, Epiknovel.Shared.Core.Interfaces.Management.ISystemSettingProvider settings) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/books/chapters");
        Policies(PolicyNames.AuthorContentAccess);
        Summary(s => {
            s.Summary = "Bir kitaba yeni bir bölüm ekler.";
            s.Description = "İçeriği paragraflar halinde (satır bazlı) saklar. BOLA mülkiyet kontrolü içerir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 1. Ücretli Yazarlık Yetki Kontrolü (Yetki kontrolü Handler yerine API katmanında kalabilir)
        if (!req.IsFree || req.Price > 0)
        {
            // 🚀 GLOBAL ECONOMY CHECK
            var paidChaptersAllowed = await settings.GetSettingValueAsync<string>("CONTENT_AllowPaidChapters", ct);
            if (paidChaptersAllowed == "false" && !User.IsInRole(RoleNames.Admin) && !User.IsInRole(RoleNames.SuperAdmin))
            {
                await Send.ResponseAsync(Result<Response>.Failure("Ücretli içerik sistemi (Bölüm Satışı) şu anda kapalıdır."), 403, ct);
                return;
            }

            var canPublishPaidChapters = await permissionService.HasPermissionAsync(User, PermissionNames.PublishPaidChapters, ct);
            if (!canPublishPaidChapters)
            {
                await Send.ResponseAsync(Result<Response>.Failure("Ücretli bölüm yayınlamak için önce başvurup onay almalısınız."), 403, ct);
                return;
            }
        }

        var result = await mediator.Send(new AddChapterCommand(
            req.BookId,
            req.UserId,
            req.Title,
            "", // Slug generation is handled inside handler
            req.Order,
            req.IsFree,
            req.Price,
            req.Status,
            req.IsTitleSpoiler,
            req.ScheduledPublishDate,
            req.Lines.Select(l => new ChapterLineDto(l.Id, l.Content, l.Type)).ToList()
        ), ct);

        if (!result.IsSuccess)
        {
            // Fail and determine status code (e.g. 404 for missing book)
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), result.Message.Contains("bulunamadı") ? 404 : 400, ct);
            return;
        }

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Id = result.Data!.Id,
            Slug = result.Data.Slug,
            Message = result.Data.Message
        }), 201, ct);
    }
}
