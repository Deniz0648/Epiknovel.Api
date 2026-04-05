using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Books.Migrations
{
    /// <inheritdoc />
    public partial class AddOutboxAndAudit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditArchives",
                schema: "books",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EntityType = table.Column<string>(type: "text", nullable: false),
                    EntityId = table.Column<Guid>(type: "uuid", nullable: false),
                    DataJson = table.Column<string>(type: "text", nullable: false),
                    PerformedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArchivedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ModerationNote = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditArchives", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "OutboxMessages",
                schema: "books",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    ProcessedOnUtc = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    Error = table.Column<string>(type: "text", nullable: true),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ModerationNote = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OutboxMessages", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditArchives_EntityId",
                schema: "books",
                table: "AuditArchives",
                column: "EntityId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditArchives_EntityType",
                schema: "books",
                table: "AuditArchives",
                column: "EntityType");

            migrationBuilder.CreateIndex(
                name: "IX_OutboxMessages_ProcessedOnUtc",
                schema: "books",
                table: "OutboxMessages",
                column: "ProcessedOnUtc");

            // 🚀 POSTGRESQL LISTEN/NOTIFY TRIGGER
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION books.notify_outbox_inserted() RETURNS trigger AS $$
                BEGIN
                  PERFORM pg_notify('outbox_inserted', '');
                  RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER trg_outbox_inserted
                AFTER INSERT ON books.""OutboxMessages""
                FOR EACH STATEMENT
                EXECUTE FUNCTION books.notify_outbox_inserted();
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_outbox_inserted ON books.\"OutboxMessages\";");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS books.notify_outbox_inserted();");

            migrationBuilder.DropTable(
                name: "AuditArchives",
                schema: "books");

            migrationBuilder.DropTable(
                name: "OutboxMessages",
                schema: "books");
        }
    }
}
