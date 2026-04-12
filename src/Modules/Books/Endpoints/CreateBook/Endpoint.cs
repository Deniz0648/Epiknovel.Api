using FastEndpoints;
using Epiknovel.Modules.Books.Features.Books.Commands.CreateBook;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Shared.Core.Constants;
using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Interfaces.Management;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Epiknovel.Modules.Books.Endpoints.CreateBook;

[AuditLog("Yeni Kitap Oluşturuldu")]
public class Endpoint(IMediator mediator, ISystemSettingProvider settings) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Post("/books");
        Policies(PolicyNames.AuthorContentAccess);
        Options(x => x.RequireRateLimiting("StrictPolicy"));
        Summary(s => {
            s.Summary = "Yeni bir kitap/roman oluşturur.";
            s.Description = "Yazar bilgileri token'dan otomatik alınır ve BOLA koruması uygulanır.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        // 🚀 RESTRICTION: Authors can only create ORIGINAL books.
        // Translation books can only be created by Admins/Mods via Admin Panel.
        if (req.Type == BookType.Translation && !User.IsInRole(RoleNames.Admin) && !User.IsInRole(RoleNames.Mod) && !User.IsInRole(RoleNames.SuperAdmin))
        {
            await Send.ResponseAsync(Result<Response>.Failure("Çeviri eser oluşturma yetkiniz bulunmamaktadır. Lütfen Orijinal Eser seçiniz."), 403, ct);
            return;
        }

        // 🚀 GLOBAL SETTING CHECK
        if (req.Type == BookType.Original && !User.IsInRole(RoleNames.Admin) && !User.IsInRole(RoleNames.SuperAdmin))
        {
            var allowNewBooks = await settings.GetSettingValueAsync<string>("CONTENT_AllowNewBooks", ct);
            if (allowNewBooks == "false")
            {
                await Send.ResponseAsync(Result<Response>.Failure("Şu anda yeni kitap oluşturma (Orijinal Eser) geçici olarak kapalıdır."), 403, ct);
                return;
            }
        }

        var result = await mediator.Send(new CreateBookCommand(
            req.UserId,
            req.Title,
            req.Description,
            req.CoverImageUrl,
            req.Status,
            req.ContentRating,
            req.Type,
            req.OriginalAuthorName,
            req.CategoryIds,
            req.Tags
        ), ct);

        if (!result.IsSuccess)
        {
            await Send.ResponseAsync(Result<Response>.Failure(result.Message), 400, ct);
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
