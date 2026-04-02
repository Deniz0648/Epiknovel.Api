using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Modules.Wallet.Features.Purchases.Commands.PurchaseChapter;

public record PurchaseChapterCommand(
    Guid UserId,
    Guid ChapterId
) : IRequest<Result<string>>;
