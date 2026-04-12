using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Wallet.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIyzicoTokenAndXmin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IyzicoToken",
                schema: "wallet",
                table: "CoinPurchaseOrders",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                schema: "wallet",
                table: "CoinPurchaseOrders",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IyzicoToken",
                schema: "wallet",
                table: "CoinPurchaseOrders");

            migrationBuilder.DropColumn(
                name: "xmin",
                schema: "wallet",
                table: "CoinPurchaseOrders");
        }
    }
}
