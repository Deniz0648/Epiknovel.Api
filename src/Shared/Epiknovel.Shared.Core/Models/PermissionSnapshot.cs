namespace Epiknovel.Shared.Core.Models;

public class PermissionSnapshot
{
    public bool AccessAuthorPanel { get; set; }
    public bool CreateBook { get; set; }
    public bool PublishPaidChapters { get; set; }
    public bool ManageOwnBooks { get; set; }
    public bool ManageOwnChapters { get; set; }
    public bool ModerateContent { get; set; }
    public bool AdminAccess { get; set; }
    public bool SuperAdminAccess { get; set; }
}
