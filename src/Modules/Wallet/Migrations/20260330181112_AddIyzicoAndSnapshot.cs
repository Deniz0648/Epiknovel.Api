using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Wallet.Migrations
{
    /// <inheritdoc />
    public partial class AddIyzicoAndSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Amount",
                schema: "wallet",
                table: "WalletTransactions",
                newName: "CoinAmount");

            migrationBuilder.AddColumn<decimal>(
                name: "AppliedAuthorShare",
                schema: "wallet",
                table: "WalletTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AppliedCoinPrice",
                schema: "wallet",
                table: "WalletTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FiatAmount",
                schema: "wallet",
                table: "WalletTransactions",
                type: "numeric",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "CoinPurchaseOrders",
                schema: "wallet",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoinPackageId = table.Column<Guid>(type: "uuid", nullable: false),
                    PricePaid = table.Column<decimal>(type: "numeric", nullable: false),
                    CoinAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    IyzicoConversationId = table.Column<string>(type: "text", nullable: false),
                    IyzicoPaymentId = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    InvoiceFileUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CoinPurchaseOrders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CoinPurchaseOrders_CoinPackages_CoinPackageId",
                        column: x => x.CoinPackageId,
                        principalSchema: "wallet",
                        principalTable: "CoinPackages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CoinPurchaseOrders_CoinPackageId",
                schema: "wallet",
                table: "CoinPurchaseOrders",
                column: "CoinPackageId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CoinPurchaseOrders",
                schema: "wallet");

            migrationBuilder.DropColumn(
                name: "AppliedAuthorShare",
                schema: "wallet",
                table: "WalletTransactions");

            migrationBuilder.DropColumn(
                name: "AppliedCoinPrice",
                schema: "wallet",
                table: "WalletTransactions");

            migrationBuilder.DropColumn(
                name: "FiatAmount",
                schema: "wallet",
                table: "WalletTransactions");

            migrationBuilder.RenameColumn(
                name: "CoinAmount",
                schema: "wallet",
                table: "WalletTransactions",
                newName: "Amount");
        }
    }
}
