using FastEndpoints;
using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Data;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Models;

using Epiknovel.Shared.Core.Attributes;
using Epiknovel.Shared.Core.Constants;

namespace Epiknovel.Modules.Books.Endpoints.UpdateBookMetadata;

[AuditLog("Kitap Metaverileri Güncellendi (Yönetici)")]
public class Endpoint(BooksDbContext dbContext) : Endpoint<Request, Result<Response>>
{
    public override void Configure()
    {
        Patch("/books/{bookId}/metadata");
        Policies(PolicyNames.AdminAccess);
        Summary(s => {
            s.Summary = "Kitabın metaverilerini (Yazar, Tip, Editörün Seçimi) günceller.";
            s.Description = "Yönetici yetkisi gerektiren alanları güncellemek için kullanılır. Sadece Admin ve SuperAdmin yetkisiyle erişilebilir.";
        });
    }

    public override async Task HandleAsync(Request req, CancellationToken ct)
    {
        var bookId = Route<Guid>("bookId");
        var book = await dbContext.Books.FirstOrDefaultAsync(x => x.Id == bookId, ct);

        if (book == null)
        {
            await Send.ResponseAsync(Result<Response>.Failure("Kitap bulunamadı."), 404, ct);
            return;
        }

        if (req.NewAuthorId.HasValue)
        {
            book.AuthorId = req.NewAuthorId.Value;
        }

        if (req.Type.HasValue)
        {
            book.Type = req.Type.Value;
        }

        if (req.IsEditorChoice.HasValue)
        {
            book.IsEditorChoice = req.IsEditorChoice.Value;
        }

        if (req.IsHidden.HasValue)
        {
            book.IsHidden = req.IsHidden.Value;
        }

        await dbContext.SaveChangesAsync(ct);

        await Send.ResponseAsync(Result<Response>.Success(new Response
        {
            Message = "Kitap metaverileri başarıyla güncellendi."
        }), 200, ct);
    }
}
