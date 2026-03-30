namespace Epiknovel.Shared.Core.Constants;

public static class ApiMessages
{
    public static class Common
    {
        public const string Success = "İşlem başarıyla tamamlandı.";
        public const string NotFound = "İstediğiniz kayıt bulunamadı.";
        public const string ValidationError = "Girilen bilgilerde geçersiz alanlar var.";
        public const string InternalError = "Sunucu tarafında beklenmedik bir hata oluştu.";
        public const string Unauthorized = "Bu işlem için yetkiniz bulunmamaktadır.";
    }

    public static class Identity
    {
        public const string LoginSuccess = "Başarıyla giriş yapıldı.";
        public const string LoginFailed = "E-posta veya şifre hatalı.";
        public const string RegisterSuccess = "Hesabınız başarıyla oluşturuldu.";
        public const string UserBanned = "Hesabınız askıya alınmıştır.";
    }

    public static class Books
    {
        public const string BookNotFound = "Kitap bulunamadı.";
        public const string ChapterLocked = "Bu bölümü okumak için kilidini açmalısınız.";
        public const string AuthorSuspended = "Yazar yetkileriniz kısıtlanmıştır.";
    }

    // --- Repair Constants ---
    public const string UserNotFound = "Kullanıcı bulunamadı.";
    public const string UserCreatedSuccessfully = "Hesabınız başarıyla oluşturuldu.";
    public const string EmailConfirmedSuccessfully = "E-postanız başarıyla doğrulandı.";
    public const string PasswordResetLinkSent = "Şifre sıfırlama linki e-postanıza gönderildi.";
    public const string PasswordResetSuccessfully = "Şifreniz başarıyla sıfırlandı.";
    public const string InvalidEmailOrPassword = "E-posta veya şifre hatalı.";
    public const string InvalidOrExpiredSession = "Oturum geçersiz veya süresi dolmuş.";
    public const string LoggedOutSuccessfully = "Başarıyla çıkış yapıldı.";
    public const string PasswordChangedSuccessfully = "Şifreniz başarıyla değiştirildi.";
    public const string EmailChangedSuccessfully = "E-postanız başarıyla değiştirildi.";
    public const string AllSessionsRevokedSuccessfully = "Tüm diğer oturumlar sonlandırıldı.";
    public const string ChangeEmailLinkSent = "E-posta değişikliği için onay linki gönderildi.";
    public const string SessionNotFound = "Oturum bulunamadı.";
    public const string SessionRevokedSuccessfully = "Oturum başarıyla sonlandırıldı.";
}
