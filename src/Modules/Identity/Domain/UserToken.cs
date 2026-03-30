using Epiknovel.Shared.Core.Interfaces;

namespace Epiknovel.Modules.Identity.Domain;

public enum UserTokenType
{
    EmailConfirmation,
    PasswordReset
}

public class UserToken : IOwnable
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    
    public string Token { get; set; } = string.Empty;
    public UserTokenType Type { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
}
