using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Users.Domain;

namespace Epiknovel.Modules.Users.Data;

public class UsersDbContext(DbContextOptions<UsersDbContext> options) : DbContext(options)
{
    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();
    public DbSet<UserSlugHistory> UserSlugHistories => Set<UserSlugHistory>();
    public DbSet<UserAddress> UserAddresses => Set<UserAddress>();
    public DbSet<Follow> Follows => Set<Follow>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Modüler Monolit: Her modülün kendi şeması vardır
        modelBuilder.HasDefaultSchema("users");

        // Konrefigürasyonlar
        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("UserProfiles", "users");
            entity.HasKey(x => x.Id);
            
            entity.HasIndex(x => x.Slug).IsUnique(); // Slug benzersiz olmalı
        });

        modelBuilder.Entity<UserSlugHistory>(entity =>
        {
            entity.ToTable("UserSlugHistories", "users");
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.HasIndex(x => x.UserId);
        });

        modelBuilder.Entity<Follow>(entity =>
        {
            entity.ToTable("Follows", "users");
            entity.HasKey(x => x.Id);

            // Mükerrer takibi veritabanı seviyesinde engelle (Security Hardening)
            entity.HasIndex(f => new { f.FollowerId, f.FollowingId }).IsUnique();

            entity.HasOne(f => f.Follower)
                .WithMany()
                .HasForeignKey(f => f.FollowerId)
                .OnDelete(DeleteBehavior.NoAction); // Döngüsel silmeyi engelle

            entity.HasOne(f => f.Following)
                .WithMany()
                .HasForeignKey(f => f.FollowingId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<UserAddress>(b => b.ToTable("UserAddresses"));
    }
}
