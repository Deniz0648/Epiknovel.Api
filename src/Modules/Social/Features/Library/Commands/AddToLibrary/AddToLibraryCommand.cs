using Epiknovel.Modules.Social.Features.Library.Queries.GetLibraryList;
using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Social.Features.Library.Commands.AddToLibrary;

public record AddToLibraryCommand(Guid UserId, Guid BookId, int? Status = null) : IRequest<Result<LibraryItemResponse>>;
