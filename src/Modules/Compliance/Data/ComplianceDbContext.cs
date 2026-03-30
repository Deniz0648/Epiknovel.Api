using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Compliance.Domain;

namespace Epiknovel.Modules.Compliance.Data;

public class ComplianceDbContext(DbContextOptions<ComplianceDbContext> options) : DbContext(options)
{
    public DbSet<UserAgreement> UserAgreements => Set<UserAgreement>();
    public DbSet<TaxExemptionInfo> TaxExemptionInfos => Set<TaxExemptionInfo>();
    public DbSet<VerifiedIBAN> VerifiedIBANs => Set<VerifiedIBAN>();
    public DbSet<SecureDocument> SecureDocuments => Set<SecureDocument>();

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
    }
}
