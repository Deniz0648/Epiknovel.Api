using System;
using Epiknovel.Modules.Users.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Users.Migrations
{
    [DbContext(typeof(UsersDbContext))]
    [Migration("20260401121500_AddUserSlugHistory")]
    /// <inheritdoc />
    public partial class AddUserSlugHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserSlugHistories",
                schema: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ModerationNote = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSlugHistories", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserSlugHistories_Slug",
                schema: "users",
                table: "UserSlugHistories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSlugHistories_UserId",
                schema: "users",
                table: "UserSlugHistories",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserSlugHistories",
                schema: "users");
        }
    }
}
