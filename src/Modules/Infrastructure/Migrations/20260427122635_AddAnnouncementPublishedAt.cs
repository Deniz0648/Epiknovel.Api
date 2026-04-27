using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAnnouncementPublishedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                schema: "infrastructure",
                table: "Announcements",
                type: "timestamp without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PublishedAt",
                schema: "infrastructure",
                table: "Announcements");
        }
    }
}
