using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Management.Domain;
using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Management.Data;

public class ManagementDbContext(DbContextOptions<ManagementDbContext> options) : DbContext(options)
{
    public DbSet<AuthorApplication> AuthorApplications => Set<AuthorApplication>();
    public DbSet<PaidAuthorApplication> PaidAuthorApplications => Set<PaidAuthorApplication>();
    public DbSet<PayoutRequest> PayoutRequests => Set<PayoutRequest>();
    public DbSet<SupportTicket> SupportTickets => Set<SupportTicket>();
    public DbSet<SupportTicketMessage> SupportTicketMessages => Set<SupportTicketMessage>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<Discount> Discounts => Set<Discount>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<DailyQuote> DailyQuotes => Set<DailyQuote>();
    public DbSet<FAQ> FAQs => Set<FAQ>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Modüler Monolit: Her modülün kendi şeması vardır
        modelBuilder.HasDefaultSchema("management");

        // Konfigürasyonlar
        modelBuilder.Entity<AuthorApplication>(b => b.ToTable("AuthorApplications"));
        modelBuilder.Entity<PaidAuthorApplication>(b => b.ToTable("PaidAuthorApplications"));
        modelBuilder.Entity<PayoutRequest>(b => b.ToTable("PayoutRequests"));
        modelBuilder.Entity<SupportTicket>(b => b.ToTable("SupportTickets"));
        modelBuilder.Entity<SupportTicketMessage>(b => {
             b.ToTable("SupportTicketMessages");
             b.HasIndex(x => x.TicketId);
        });
        modelBuilder.Entity<SystemSetting>(b => {
            b.ToTable("SystemSettings");
            b.HasKey(x => x.Key);
        });
        modelBuilder.Entity<EmailTemplate>(b => {
             b.ToTable("EmailTemplates");
             b.HasIndex(x => x.Key).IsUnique();
        });
        modelBuilder.Entity<Discount>(b => b.ToTable("Discounts"));
        modelBuilder.Entity<AuditLog>(b => {
             b.ToTable("AuditLogs");
             b.HasIndex(x => x.CreatedAt);
             b.HasIndex(x => x.UserId);
             b.HasIndex(x => x.Module);
             b.HasIndex(x => x.TraceId);
        });
        modelBuilder.Entity<DailyQuote>(b => {
             b.ToTable("DailyQuotes");
             b.HasQueryFilter(x => !x.IsDeleted);
        });
        modelBuilder.Entity<FAQ>(b => {
             b.ToTable("FAQs");
             b.HasQueryFilter(x => !x.IsDeleted);
        });
        modelBuilder.Entity<Epiknovel.Shared.Core.Domain.OutboxMessage>(b => {
             b.ToTable("OutboxMessages");
             b.HasIndex(x => x.ProcessedAtUtc);
        });
    }
}
