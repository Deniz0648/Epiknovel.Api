namespace Epiknovel.Shared.Core.Constants;

public static class PolicyNames
{
    // Sadece SuperAdmin (Ekonomi, Site Ayarları)
    public const string SuperAdminOnly = "SuperAdminOnly";
    
    // Admin ve Üzeri (Kullanıcı, Rol ve Genel Yönetim)
    public const string AdminAccess = "AdminAccess";
    
    // Moderatör ve Üzeri (İçerik, Şikayet ve Rapor Yönetimi)
    public const string ModAccess = "ModAccess";
}
