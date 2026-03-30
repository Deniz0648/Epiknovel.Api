using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Compliance.Domain;

namespace Epiknovel.Modules.Compliance.Data;

public class ComplianceDbContext(DbContextOptions<ComplianceDbContext> options) : DbContext(options)
{
    public DbSet<UserAgreement> UserAgreements => Set<UserAgreement>();
    public DbSet<TaxExemptionInfo> TaxExemptionInfos => Set<TaxExemptionInfo>();
    public DbSet<VerifiedIBAN> VerifiedIBANs => Set<VerifiedIBAN>();
    public DbSet<SecureDocument> SecureDocuments => Set<SecureDocument>();
    public DbSet<ModerationTicket> ModerationTickets => Set<ModerationTicket>();
    public DbSet<UserStrike> UserStrikes => Set<UserStrike>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Modüler Monolit: Her modülün kendi şeması vardır
        modelBuilder.HasDefaultSchema("compliance");

        // Konfigürasyonlar
        modelBuilder.Entity<UserAgreement>(b => b.ToTable("UserAgreements"));
        modelBuilder.Entity<TaxExemptionInfo>(b => b.ToTable("TaxExemptionInfos"));
        modelBuilder.Entity<VerifiedIBAN>(b => b.ToTable("VerifiedIBANs"));
        modelBuilder.Entity<SecureDocument>(b => b.ToTable("SecureDocuments"));
        modelBuilder.Entity<ModerationTicket>(b => b.ToTable("ModerationTickets"));
        modelBuilder.Entity<UserStrike>(b => b.ToTable("UserStrikes"));
    }
}
