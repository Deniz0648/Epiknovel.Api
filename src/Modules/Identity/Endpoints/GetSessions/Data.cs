namespace Epiknovel.Modules.Identity.Endpoints.GetSessions;

public class Response
{
    public Guid SessionId { get; set; }
    public string Device { get; set; } = string.Empty; // UserAgent'tan süzülmüş halini hayal ediyoruz
    public string IpAddress { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsCurrent { get; set; }
}
