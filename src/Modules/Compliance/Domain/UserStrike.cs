using System;

namespace Epiknovel.Modules.Compliance.Domain;

public class UserStrike
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    // Uyarı Alan Kullanıcı
    public Guid UserId { get; set; }
    
    // Uyarıyı Veren Admin
    public Guid AdminId { get; set; }
    
    // Uyarıya Sebep Olan Bilet (Opsiyonel)
    public Guid? TicketId { get; set; }
    
    public string Reason { get; set; } = string.Empty;
    
    public DateTime GivenAt { get; set; } = DateTime.UtcNow;
    
    // Kullanıcının karnesinden silineceği tarih
    public DateTime ExpiryDate { get; set; }
    
    // Bu uyarı sonucunda aktif bir yaptırım uygulandı mı (örn. yorum kısıtlaması)
    public bool IsActive => DateTime.UtcNow < ExpiryDate;
}
