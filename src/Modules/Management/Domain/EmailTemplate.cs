using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Management.Domain;

public class EmailTemplate : BaseEntity
{
    public string Name { get; set; } = string.Empty; // Friendly name for admin display
    public string Key { get; set; } = string.Empty;  // Unique identifier: "WelcomeEmail", "PasswordReset", etc.
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty; // HTML or Markdown content
    public string Variables { get; set; } = string.Empty; // Comma separated list of variables for display in admin (e.g., "{UserName},{ResetLink}")
    
    public bool IsActive { get; set; } = true;
}
