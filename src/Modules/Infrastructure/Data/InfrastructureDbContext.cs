using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Infrastructure.Domain;
using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Infrastructure.Data;

public class InfrastructureDbContext(DbContextOptions<InfrastructureDbContext> options) : DbContext(options)
{
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<Quote> Quotes => Set<Quote>();
    public DbSet<Faq> Faqs => Set<Faq>();
    public DbSet<SystemDocument> SystemDocuments => Set<SystemDocument>();
    public DbSet<Epiknovel.Shared.Core.Domain.OutboxMessage> OutboxMessages => Set<Epiknovel.Shared.Core.Domain.OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Modüler Monolit: Her modülün kendi şeması vardır
        modelBuilder.HasDefaultSchema("infrastructure");

        modelBuilder.Entity<Notification>(b => b.ToTable("Notifications"));

        modelBuilder.Entity<Announcement>(b => b.ToTable("Announcements"));
        modelBuilder.Entity<Quote>(b => b.ToTable("Quotes"));
        modelBuilder.Entity<Faq>(b => b.ToTable("Faqs"));
        modelBuilder.Entity<SystemDocument>(b => b.ToTable("SystemDocuments"));

        modelBuilder.Entity<Epiknovel.Shared.Core.Domain.OutboxMessage>(b => {
             b.ToTable("OutboxMessages");
             b.HasIndex(x => x.ProcessedAtUtc);
        });
    }
}
