namespace Epiknovel.Modules.Management.Domain;

public static class DefaultTemplates
{
    public static readonly Dictionary<string, (string Name, string Subject, string Body, string Variables)> Templates = new()
    {
        {
            "WelcomeEmail",
            ("Hoş Geldin", "Epiknovel'e Hoş Geldin {UserName}!", "<h1>Merhaba {UserName},</h1><p>Epiknovel ailesine katıldığın için çok mutluyuz. Binlerce hikaye seni bekliyor!</p>", "{UserName}")
        },
        {
            "PasswordReset",
            ("Şifre Sıfırla", "Şifre Sıfırlama İsteği", "<h1>Şifreni mi unuttun {UserName}?</h1><p>Aşağıdaki bağlantıyı kullanarak şifreni sıfırlayabilirsin:</p><a href='{ResetLink}'>Şifremi Sıfırla</a>", "{UserName},{ResetLink}")
        },
        {
            "NewChapterEmail",
            ("Yeni Bölüm", "Takip Ettiğin Kitaba Yeni Bölüm Geldi: {BookTitle}", "<h1>Yeni Bölüm!</h1><p>Merhaba {UserName}, {BookTitle} kitabına <strong>{ChapterTitle}</strong> isimli yeni bir bölüm eklendi.</p><a href='{ActionLink}'>Hemen Oku</a>", "{UserName},{BookTitle},{ChapterTitle},{ActionLink}")
        },
        {
            "NewReviewEmail",
            ("Yeni İnceleme", "Kitabına Yeni İnceleme Geldi: {BookTitle}", "<h1>Yeni İnceleme!</h1><p>Merhaba {UserName}, <strong>{BookTitle}</strong> kitabın için yeni bir inceleme yazıldı.</p><p>Puan: {Rating}/5</p><a href='{ActionLink}'>İncelemeyi Gör</a>", "{UserName},{BookTitle},{Rating},{ActionLink}")
        },
        {
            "NewCommentEmail",
            ("Yeni Yorum", "Yeni Bir Yorumun Var", "<h1>Yeni Yorum!</h1><p>Merhaba {UserName}, bir içeriğine yeni bir yorum yapıldı veya yorumuna cevap verildi.</p><a href='{ActionLink}'>Yorumu Gör</a>", "{UserName},{ActionLink}")
        },
        {
            "InvoiceCreatedEmail",
            ("Fatura", "Sipariş Faturanız Hazır", "<h1>Faturanız Hazır</h1><p>Merhaba {UserName}, {Amount} tutarındaki alımınıza ait faturanız oluşturulmuştur.</p><a href='{ActionLink}'>Faturayı İndir</a>", "{UserName},{Amount},{ActionLink}")
        },
        {
            "AuthorApplicationApprovedEmail",
            ("Yazar Onay", "Yazarlık Başvurun Onaylandı!", "<h1>Tebrikler {UserName}!</h1><p>Epiknovel yazarlık başvurunuz incelenmiş ve onaylanmıştır. Artık kendi hikayelerinizi paylaşmaya başlayabilirsiniz.</p><a href='{ActionLink}'>Yazar Paneline Git</a>", "{UserName},{ActionLink}")
        },
        {
            "AuthorApplicationRejectedEmail",
            ("Yazar Red", "Yazarlık Başvurusu Hakkında", "<h1>Merhaba {UserName},</h1><p>Yazarlık başvurunuz maalesef şu aşamada onaylanamamıştır.</p><p><strong>Gerekçe:</strong> {Reason}</p><p>Eksiklerinizi tamamlayarak ileride tekrar başvurabilirsiniz.</p>", "{UserName},{Reason}")
        },
        {
            "PaidAuthorApplicationApprovedEmail",
            ("Ücretli Onay", "Ücretli Yazarlık Başvurun Onaylandı!", "<h1>Tebrikler {UserName}!</h1><p>Ücretli yazarlık başvurunuz onaylanmıştır. Artık bölümlerinize fiyat belirleyebilir ve gelir elde edebilirsiniz.</p><a href='{ActionLink}'>Yazar Paneline Git</a>", "{UserName},{ActionLink}")
        },
        {
            "PaidAuthorApplicationRejectedEmail",
            ("Ücretli Red", "Ücretli Yazarlık Başvurusu Hakkında", "<h1>Merhaba {UserName},</h1><p>Ücretli yazarlık başvurunuz maalesef şu aşamada onaylanamamıştır.</p><p><strong>Gerekçe:</strong> {Reason}</p><p>Gerekli düzenlemeleri yaparak ileride tekrar başvurabilirsiniz.</p>", "{UserName},{Reason}")
        },
        {
            "SupportResponse",
            ("Destek", "Destek Talebiniz Yanıtlandı", "<h1>Merhaba {UserName},</h1><p><strong>{TicketTitle}</strong> konulu talebinize yeni bir yanıt geldi:</p><p>{ResponseMessage}</p><a href='{TicketLink}'>Talebi Görüntüle</a>", "{UserName},{TicketTitle},{ResponseMessage},{TicketLink}")
        },
        {
            "EmailVerification",
            ("E-Posta Doğrulama", "E-Posta Adresinizi Doğrulayın", "<h1>Merhaba {UserName},</h1><p>Epiknovel'e kayıt olduğunuz için teşekkürler. Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın:</p><a href='{ActionLink}'>E-Postamı Doğrula</a>", "{UserName},{ActionLink}")
        },
        {
            "EmailChange",
            ("E-Posta Değiştirme", "E-Posta Değiştirme İsteği", "<h1>Merhaba {UserName},</h1><p>Hesabınızın e-posta adresini değiştirmek için bir istek aldık. Onaylamak için bağlantıya tıklayın:</p><a href='{ActionLink}'>Değişikliği Onayla</a>", "{UserName},{ActionLink}")
        },
        {
            "OrderConfirmation",
            ("Sipariş Onayı", "Siparişiniz Başarıyla Tamamlandı", "<h1>Siparişiniz Alındı!</h1><p>Merhaba {UserName}, {PlanName} paket alımınız başarıyla tamamlanmıştır.</p>", "{UserName},{PlanName}")
        },
        {
            "NewFollower",
            ("Yeni Takipçi", "Yeni Bir Takipçiniz Var!", "<h1>Yeni Takipçi!</h1><p>Merhaba {UserName}, <strong>{FollowerName}</strong> sizi takip etmeye başladı.</p>", "{UserName},{FollowerName}")
        }
    };
}
