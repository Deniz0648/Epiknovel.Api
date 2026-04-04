using System;

namespace Epiknovel.Shared.Core.Attributes;

/// <summary>
/// Markalanan endpoint'in Idempotency (aynı isteğin tekrar işlenmemesi) kuralına tabi olduğunu belirtir.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class IdempotencyAttribute : Attribute
{
    public int ExpiryHours { get; }

    public IdempotencyAttribute(int expiryHours = 24)
    {
        ExpiryHours = expiryHours;
    }
}
