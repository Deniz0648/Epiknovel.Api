using Microsoft.EntityFrameworkCore;
using Epiknovel.Modules.Wallet.Domain;
using Epiknovel.Shared.Core.Domain;

namespace Epiknovel.Modules.Wallet.Data;

public class WalletDbContext(DbContextOptions<WalletDbContext> options) : DbContext(options)
{
    public DbSet<Wallet.Domain.Wallet> Wallets => Set<Wallet.Domain.Wallet>();
    public DbSet<WalletTransaction> WalletTransactions => Set<WalletTransaction>();
    public DbSet<CoinPackage> CoinPackages => Set<CoinPackage>();
    public DbSet<CoinPurchaseOrder> CoinPurchaseOrders => Set<CoinPurchaseOrder>();
    public DbSet<WithdrawRequest> WithdrawRequests => Set<WithdrawRequest>();
    public DbSet<UserUnlockedChapter> UserUnlockedChapters => Set<UserUnlockedChapter>();
    public DbSet<MonthlyRoyaltyReport> MonthlyRoyaltyReports => Set<MonthlyRoyaltyReport>();
    public DbSet<SpendingCampaign> SpendingCampaigns => Set<SpendingCampaign>();
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Modüler Monolit: Her modülün kendi şeması vardır
        modelBuilder.HasDefaultSchema("wallet");

        // Konfigürasyonlar
        modelBuilder.Entity<Wallet.Domain.Wallet>(b => {
           b.ToTable("Wallets", t => {
               t.HasCheckConstraint("CK_Wallet_CoinBalance", "\"CoinBalance\" >= 0");
               t.HasCheckConstraint("CK_Wallet_RevenueBalance", "\"RevenueBalance\" >= 0");
           });
           b.Property(x => x.Version).IsRowVersion(); // Optimistic Concurrency
        });

        modelBuilder.Entity<WalletTransaction>(b => b.ToTable("WalletTransactions"));

        modelBuilder.Entity<CoinPackage>(b => b.ToTable("CoinPackages"));
        modelBuilder.Entity<CoinPurchaseOrder>(b => {
             b.ToTable("CoinPurchaseOrders");
             b.Property(x => x.Version).IsRowVersion();
        });
        modelBuilder.Entity<WithdrawRequest>(b => b.ToTable("WithdrawRequests"));
        modelBuilder.Entity<UserUnlockedChapter>(b => b.ToTable("UserUnlockedChapters"));
        modelBuilder.Entity<MonthlyRoyaltyReport>(b => b.ToTable("MonthlyRoyaltyReports"));
        modelBuilder.Entity<SpendingCampaign>(b => b.ToTable("SpendingCampaigns"));

        modelBuilder.Entity<Epiknovel.Shared.Core.Domain.OutboxMessage>(b => {
             b.ToTable("OutboxMessages");
             b.HasIndex(x => x.ProcessedAtUtc);
        });
    }
}
