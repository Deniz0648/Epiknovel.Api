using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Management.Migrations
{
    /// <inheritdoc />
    public partial class RefactorPaidAuthorDocumentIds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankAccountDocumentUrl",
                schema: "management",
                table: "PaidAuthorApplications");

            migrationBuilder.DropColumn(
                name: "GvkExemptionCertificateUrl",
                schema: "management",
                table: "PaidAuthorApplications");

            migrationBuilder.AddColumn<Guid>(
                name: "BankAccountDocumentId",
                schema: "management",
                table: "PaidAuthorApplications",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "GvkExemptionCertificateId",
                schema: "management",
                table: "PaidAuthorApplications",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BankAccountDocumentId",
                schema: "management",
                table: "PaidAuthorApplications");

            migrationBuilder.DropColumn(
                name: "GvkExemptionCertificateId",
                schema: "management",
                table: "PaidAuthorApplications");

            migrationBuilder.AddColumn<string>(
                name: "BankAccountDocumentUrl",
                schema: "management",
                table: "PaidAuthorApplications",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "GvkExemptionCertificateUrl",
                schema: "management",
                table: "PaidAuthorApplications",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
