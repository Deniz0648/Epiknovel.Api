using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Books.Domain;
using Epiknovel.Shared.Core.Domain;
using MediatR;
using System.Text.Json;

namespace Epiknovel.Modules.Books.Data;

public class BooksDbContext(DbContextOptions<BooksDbContext> options) : DbContext(options)
{
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Chapter> Chapters => Set<Chapter>();
    public DbSet<Paragraph> Paragraphs => Set<Paragraph>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<AuditArchive> AuditArchives => Set<AuditArchive>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();
    public DbSet<BookRating> BookRatings => Set<BookRating>();
    public DbSet<BookMember> BookMembers => Set<BookMember>();

    /// <summary>
    /// Bir MediatR notification olayını asenkron işlenmek üzere Outbox tablosuna yazar. 
    /// Veritabanı transaction'ı ile atomik şekilde kaydedilir.
    /// </summary>
    public void EnqueueOutboxMessage<T>(T notification) where T : INotification
    {
        var message = new OutboxMessage
        {
            Type = typeof(T).AssemblyQualifiedName ?? typeof(T).FullName!,
            Content = JsonSerializer.Serialize(notification),
            CreatedAt = DateTime.UtcNow
        };
        OutboxMessages.Add(message);
    }

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

        modelBuilder.Entity<Category>(b => {
            b.ToTable("Categories");
            b.HasQueryFilter(x => !x.IsDeleted);
        });
        modelBuilder.Entity<Tag>(b => {
            b.ToTable("Tags");
            b.HasQueryFilter(x => !x.IsDeleted);
        });
        modelBuilder.Entity<Paragraph>(b => {
            b.ToTable("Paragraphs");
            b.HasIndex(x => new { x.ChapterId, x.Order }); // Sequential read performance
            b.HasQueryFilter(x => !x.Chapter.IsDeleted && !x.Chapter.Book.IsDeleted);
        });

        modelBuilder.Entity<AuditArchive>(b => {
           b.ToTable("AuditArchives");
           b.HasIndex(x => x.EntityId);
           b.HasIndex(x => x.EntityType);
        });

        modelBuilder.Entity<Epiknovel.Shared.Core.Domain.OutboxMessage>(b => {
           b.ToTable("OutboxMessages");
           b.HasIndex(x => x.ProcessedAtUtc);
        });

        modelBuilder.Entity<BookRating>(b => {
            b.ToTable("BookRatings");
            b.HasIndex(x => new { x.BookId, x.UserId }).IsUnique();
            b.HasQueryFilter(x => !x.Book.IsDeleted);
        });

        modelBuilder.Entity<BookMember>(b => {
           b.ToTable("BookAuthors"); // Use existing table name from initial migration
           b.HasKey(x => x.Id);
           b.HasIndex(x => new { x.BookId, x.UserId });
           b.HasQueryFilter(x => !x.Book.IsDeleted);
        });
    }
}
