using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Management.Migrations
{
    /// <inheritdoc />
    public partial class Initialv2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EntityId",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.RenameColumn(
                name: "Country",
                schema: "management",
                table: "AuditLogs",
                newName: "TraceId");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                schema: "management",
                table: "AuditLogs",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "UserAgent",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Method",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "IpAddress",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "Endpoint",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "ChangedColumns",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                schema: "management",
                table: "AuditLogs",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DeletedByUserId",
                schema: "management",
                table: "AuditLogs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                schema: "management",
                table: "AuditLogs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ModerationNote",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryKeys",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "State",
                schema: "management",
                table: "AuditLogs",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                schema: "management",
                table: "AuditLogs",
                type: "timestamp without time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Module",
                schema: "management",
                table: "AuditLogs",
                column: "Module");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_TraceId",
                schema: "management",
                table: "AuditLogs",
                column: "TraceId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_UserId",
                schema: "management",
                table: "AuditLogs",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_Module",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_TraceId",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_UserId",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "ChangedColumns",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "DeletedByUserId",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "ModerationNote",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "PrimaryKeys",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "State",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "management",
                table: "AuditLogs");

            migrationBuilder.RenameColumn(
                name: "TraceId",
                schema: "management",
                table: "AuditLogs",
                newName: "Country");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                schema: "management",
                table: "AuditLogs",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "UserAgent",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Method",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "IpAddress",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Endpoint",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EntityId",
                schema: "management",
                table: "AuditLogs",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
