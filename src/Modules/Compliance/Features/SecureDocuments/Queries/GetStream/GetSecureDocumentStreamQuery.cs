using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Compliance.Features.SecureDocuments.Queries.GetStream;

public record GetSecureDocumentStreamQuery(
    Guid DocumentId,
    Guid UserId,
    bool HasAdminAccess
) : IRequest<Result<SecureDocumentStreamResponse>>;

public record SecureDocumentStreamResponse(
    Stream Stream,
    string FileName,
    string MimeType
);
