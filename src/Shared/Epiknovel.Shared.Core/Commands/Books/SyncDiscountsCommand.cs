using Epiknovel.Shared.Core.Models;
using MediatR;

namespace Epiknovel.Shared.Core.Commands.Books;

public enum DiscountScopeType
{
    Global,
    Category,
    Book
}

public enum DiscountValueType
{
    Percentage,
    Fixed
}

public record SyncDiscountsCommand(
    DiscountScopeType Scope, 
    Guid? TargetId, 
    DiscountValueType ValueType, 
    decimal Value,
    bool IsActive) : IRequest<Result<string>>;
