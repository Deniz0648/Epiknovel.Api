using Epiknovel.Shared.Core.Enums;

namespace Epiknovel.Shared.Core.Attributes;

[AttributeUsage(AttributeTargets.Property, AllowMultiple = false)]
public class MaskedAttribute : Attribute
{
    public MaskType Type { get; }
    
    public MaskedAttribute(MaskType type = MaskType.Default)
    {
        Type = type;
    }
}
