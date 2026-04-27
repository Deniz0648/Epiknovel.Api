using Epiknovel.Modules.Social.Data;
using Epiknovel.Shared.Core.Models;
using Epiknovel.Shared.Core.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Epiknovel.Modules.Social.Features.Comments.Queries.GetCommentContent;

public record GetCommentContentQuery(string Token) : IRequest<Result<string>>;

public class GetCommentContentHandler(
    SocialDbContext dbContext,
    IEncryptionService encryptionService) : IRequestHandler<GetCommentContentQuery, Result<string>>
{
    public async Task<Result<string>> Handle(GetCommentContentQuery request, CancellationToken ct)
    {
        try
        {
            // 💡 1. Token Çözme (Decryption)
            var decryptedId = encryptionService.Decrypt(request.Token);
            if (!Guid.TryParse(decryptedId, out var commentId))
            {
                return Result<string>.Failure("Geçersiz veya süresi dolmuş token.");
            }

            // 💡 2. Veritabanından İçeriği Çekme
            var content = await dbContext.Comments
                .Where(c => c.Id == commentId && !c.IsDeleted && !c.IsHidden)
                .Select(c => c.Content)
                .FirstOrDefaultAsync(ct);

            if (content == null)
            {
                return Result<string>.Failure("Yorum bulunamadı.");
            }

            return Result<string>.Success(content);
        }
        catch
        {
            return Result<string>.Failure("Token doğrulanırken bir hata oluştu.");
        }
    }
}
