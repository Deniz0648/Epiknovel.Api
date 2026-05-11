using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Users.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificationPreferences",
                schema: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    EmailOnNewChapter = table.Column<bool>(type: "boolean", nullable: false),
                    EmailOnNewReview = table.Column<bool>(type: "boolean", nullable: false),
                    EmailOnNewComment = table.Column<bool>(type: "boolean", nullable: false),
                    PushOnNewChapter = table.Column<bool>(type: "boolean", nullable: false),
                    PushOnNewReview = table.Column<bool>(type: "boolean", nullable: false),
                    PushOnNewComment = table.Column<bool>(type: "boolean", nullable: false),
                    EmailMarketing = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationPreferences", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationPreferences_UserId",
                schema: "users",
                table: "NotificationPreferences",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationPreferences",
                schema: "users");
        }
    }
}
