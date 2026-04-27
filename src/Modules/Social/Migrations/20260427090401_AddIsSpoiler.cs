using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Social.Migrations
{
    /// <inheritdoc />
    public partial class AddIsSpoiler : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSpoiler",
                schema: "social",
                table: "Reviews",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSpoiler",
                schema: "social",
                table: "InlineComments",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSpoiler",
                schema: "social",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "IsSpoiler",
                schema: "social",
                table: "InlineComments");
        }
    }
}
