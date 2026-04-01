using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Domain;

namespace Epiknovel.Modules.Books.Data;

public class BooksDbContext(DbContextOptions<BooksDbContext> options) : DbContext(options)
{
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<Paragraph> Paragraphs => Set<Paragraph>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<BookAuthor> BookAuthors => Set<BookAuthor>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Modüler Monolit: Her modülün kendi şeması vardır
        modelBuilder.HasDefaultSchema("books");

        // 3. Konfigürasyonlar
        modelBuilder.Entity<Book>(b => {
            b.ToTable("Books");
            b.HasIndex(x => x.Slug).IsUnique().HasFilter("\"IsDeleted\" = false");
            b.HasQueryFilter(x => !x.IsDeleted); // Çöp kutusu filtreleme
        });

        modelBuilder.Entity<Chapter>(b => {
           b.ToTable("Chapters");
           b.HasIndex(x => x.Slug).IsUnique().HasFilter("\"IsDeleted\" = false");
           // Kitap içindeki bölüm sırası benzersiz olmalı (Aktif bölümler için)
           b.HasIndex(x => new { x.BookId, x.Order }).IsUnique().HasFilter("\"IsDeleted\" = false"); 
           b.HasQueryFilter(x => !x.IsDeleted && !x.Book.IsDeleted);
        });

        modelBuilder.Entity<Category>(b => b.ToTable("Categories"));
        modelBuilder.Entity<Tag>(b => b.ToTable("Tags"));
        modelBuilder.Entity<BookAuthor>(b =>
        {
            b.ToTable("BookAuthors");
            b.HasQueryFilter(x => !x.Book.IsDeleted);
        });
        modelBuilder.Entity<Paragraph>(b => {
            b.ToTable("Paragraphs");
            b.HasIndex(x => new { x.ChapterId, x.Order }); // Sequential read performance
            b.HasQueryFilter(x => !x.Chapter.IsDeleted && !x.Chapter.Book.IsDeleted);
        });
    }
}
