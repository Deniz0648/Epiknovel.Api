namespace Epiknovel.Shared.Core.Services;

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body);
}
