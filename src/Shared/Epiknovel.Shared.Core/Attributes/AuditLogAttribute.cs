namespace Epiknovel.Shared.Core.Attributes;

[AttributeUsage(AttributeTargets.Class)]
public class AuditLogAttribute : Attribute
{
    public string? ActionName { get; }

    public AuditLogAttribute(string? actionName = null)
    {
        ActionName = actionName;
    }
}
