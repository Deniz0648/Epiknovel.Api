using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Books.Migrations
{
    /// <inheritdoc />
    public partial class PendingChangesCheck : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BookAuthors_BookId",
                schema: "books",
                table: "BookAuthors");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                schema: "books",
                table: "BookAuthors",
                type: "timestamp without time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "books",
                table: "BookAuthors",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                schema: "books",
                table: "BookAuthors",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "books",
                table: "BookAuthors",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModerationNote",
                schema: "books",
                table: "BookAuthors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                schema: "books",
                table: "BookAuthors",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserDisplayName",
                schema: "books",
                table: "BookAuthors",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_BookAuthors_BookId_UserId",
                schema: "books",
                table: "BookAuthors",
                columns: new[] { "BookId", "UserId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_BookAuthors_BookId_UserId",
                schema: "books",
                table: "BookAuthors");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                schema: "books",
                table: "BookAuthors");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "books",
                table: "BookAuthors");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                schema: "books",
                table: "BookAuthors");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "books",
                table: "BookAuthors");

            migrationBuilder.DropColumn(
                name: "ModerationNote",
                schema: "books",
                table: "BookAuthors");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "books",
                table: "BookAuthors");

            migrationBuilder.DropColumn(
                name: "UserDisplayName",
                schema: "books",
                table: "BookAuthors");

            migrationBuilder.CreateIndex(
                name: "IX_BookAuthors_BookId",
                schema: "books",
                table: "BookAuthors",
                column: "BookId");
        }
    }
}
