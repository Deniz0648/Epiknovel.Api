namespace Epiknovel.Modules.Users.Endpoints.UpdateAvatar;

public class Request
{
    /// <summary>
    /// Merkezi yüklemeden (MediaUpload) dönen benzersiz dosya adı.
    /// Örn: a8f7b...webp
    /// </summary>
    public string FileName { get; set; } = string.Empty;
}

public class Response 
{
    public string AvatarUrl { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
