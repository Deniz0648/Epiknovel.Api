using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Social.Domain;

namespace Epiknovel.Modules.Social.Data;

public class SocialDbContext(DbContextOptions<SocialDbContext> options) : DbContext(options)
{
    public DbSet<BookVote> BookVotes => Set<BookVote>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<ReviewLike> ReviewLikes => Set<ReviewLike>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<InlineComment> InlineComments => Set<InlineComment>();
    public DbSet<CommentLike> CommentLikes => Set<CommentLike>();
    public DbSet<LibraryEntry> LibraryEntries => Set<LibraryEntry>();
    public DbSet<ReadingProgress> ReadingProgresses => Set<ReadingProgress>();
    public DbSet<InlineCommentLike> InlineCommentLikes => Set<InlineCommentLike>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Modüler Monolit: Her modülün kendi şeması vardır
        modelBuilder.HasDefaultSchema("social");

        // Konfigürasyonlar
        modelBuilder.Entity<BookVote>(b => b.ToTable("BookVotes"));
        modelBuilder.Entity<Review>(b => b.ToTable("Reviews"));
        modelBuilder.Entity<ReviewLike>(b => b.ToTable("ReviewLikes"));
        modelBuilder.Entity<Comment>(b => b.ToTable("Comments"));
        modelBuilder.Entity<InlineComment>(b => b.ToTable("InlineComments"));
        modelBuilder.Entity<CommentLike>(b => b.ToTable("CommentLikes"));
        modelBuilder.Entity<LibraryEntry>(b => b.ToTable("LibraryEntries"));
        modelBuilder.Entity<ReadingProgress>(b => b.ToTable("ReadingProgresses"));
        modelBuilder.Entity<InlineCommentLike>(b => b.ToTable("InlineCommentLikes"));
    }
}
