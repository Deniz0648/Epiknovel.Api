using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NpgsqlTypes;

namespace Epiknovel.Modules.Search.Domain;

public enum DocumentType
{
    Book,
    User,
    Category,
    Tag
}

/// <summary>
/// Arama optimizasyonu için veritabanında "düzleştirilmiş" (denormalized) indeks modeli.
/// Books ve Users modüllerinden asenkron olarak (Event-Driven) beslenir.
/// </summary>
public class SearchDocument
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    // Hangi modüle/tabloya ait (Book, User vs.)
    public DocumentType Type { get; set; }

    // İlgili modüldeki asıl Guid (Örn: Books tablosundaki BookId)
    public Guid ReferenceId { get; set; }

    // Aramada en yüksek ağırlık (A) - Örn: Kitap Adı, Kullanıcı Adı
    [Required, MaxLength(255)]
    public string Title { get; set; } = string.Empty;

    // Aramada düşük ağırlık (C, D) - Örn: Biyografi, Kitap Özeti
    public string? Description { get; set; }

    // Gizli Etiketler (Yüksek Ağırlık B) - Örn: Kitabın içindeki Yazar Adı, Kategoriler.
    // Kullanıcı görmese de arama motoru buradan yakalar.
    public string? Tags { get; set; }

    // Ön yüzde tıklandığında gidilecek URL (BOLA veya yönlendirme için)
    [MaxLength(150)]
    public string Slug { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? ImageUrl { get; set; }

    // Görünürlük (Örn: Kullanıcı profilini kapatırsa aramalarda çıkmamalı)
    public bool IsActive { get; set; } = true;

    // PostgreSQL Full-Text Search Vector Field
    public NpgsqlTsVector SearchVector { get; set; } = default!;
    
    // Tarihsel Sıralama (Örn: En yeni kitapları üstte göstermek için)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
