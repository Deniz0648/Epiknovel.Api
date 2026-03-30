using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Search.Domain;

namespace Epiknovel.Modules.Search.Data;

public class SearchDbContext(DbContextOptions<SearchDbContext> options) : DbContext(options)
{
    public DbSet<SearchHistory> SearchHistories => Set<SearchHistory>();
    public DbSet<SearchDocument> SearchDocuments => Set<SearchDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Modüler Monolit: Her modülün kendi şeması vardır
        modelBuilder.HasDefaultSchema("search");

        // Konfigürasyonlar
        modelBuilder.Entity<SearchHistory>(b => b.ToTable("SearchHistories"));

        modelBuilder.Entity<SearchDocument>(entity =>
        {
            entity.ToTable("SearchDocuments");

            // PostgreSQL Full-Text Search Vector Field (Title + Tags + Description)
            // Weight'li index (SetWeight) konfigürasyonu genellikle migration veya raw SQL ile yapılır.
            // EF Npgsql Provider ile basit otomatik generation:
            entity.HasGeneratedTsVectorColumn(
                p => p.SearchVector,
                "simple", // Dil fark etmez, epiknovel içeriği genelde esnektir.
                p => new { p.Title, p.Tags, p.Description });

            // GIN (Generalized Inverted Index) - FTS için en hızlı indeksleme türü
            entity.HasIndex(p => p.SearchVector)
                .HasMethod("GIN");

            // Performans için ReferenceId'ye de normal index atalım
            entity.HasIndex(p => p.ReferenceId);
        });
    }
}
