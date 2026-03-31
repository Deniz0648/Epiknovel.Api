using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Users.Domain;

public class UserSlugHistory : BaseEntity
{
    public Guid UserId { get; set; }
    public string Slug { get; set; } = string.Empty;
}
