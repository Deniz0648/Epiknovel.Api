using Epiknovel.Shared.Core.Models;
using MediatR;
using Epiknovel.Modules.Social.Domain;

namespace Epiknovel.Modules.Social.Features.Library.Commands.AddToLibrary;

public record AddToLibraryCommand(Guid UserId, Guid BookId) : IRequest<Result<string>>;
