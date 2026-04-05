namespace Epiknovel.Shared.Core.Attributes;

/// <summary>
/// Bu öznitelik ile işaretlenen özellikler (Properties), AuditInterceptor tarafından 
/// loglama sırasında atlanır. Şifre, gizli anahtar gibi veriler için kullanılır.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public class NotAuditedAttribute : Attribute
{
}
