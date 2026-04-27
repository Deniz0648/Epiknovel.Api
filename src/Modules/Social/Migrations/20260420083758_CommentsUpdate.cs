using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Epiknovel.Modules.Social.Migrations
{
    /// <inheritdoc />
    public partial class CommentsUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContentHash",
                schema: "social",
                table: "Comments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAuthorComment",
                schema: "social",
                table: "Comments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsEdited",
                schema: "social",
                table: "Comments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsPinned",
                schema: "social",
                table: "Comments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSpoiler",
                schema: "social",
                table: "Comments",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "ParagraphId",
                schema: "social",
                table: "Comments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReplyCount",
                schema: "social",
                table: "Comments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "CommentMentions",
                schema: "social",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CommentId = table.Column<Guid>(type: "uuid", nullable: false),
                    MentionedUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    DeletedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ModerationNote = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CommentMentions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CommentMentions_Comments_CommentId",
                        column: x => x.CommentId,
                        principalSchema: "social",
                        principalTable: "Comments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CommentMentions_CommentId",
                schema: "social",
                table: "CommentMentions",
                column: "CommentId");

            migrationBuilder.CreateIndex(
                name: "IX_CommentMentions_MentionedUserId",
                schema: "social",
                table: "CommentMentions",
                column: "MentionedUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CommentMentions",
                schema: "social");

            migrationBuilder.DropColumn(
                name: "ContentHash",
                schema: "social",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "IsAuthorComment",
                schema: "social",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "IsEdited",
                schema: "social",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "IsPinned",
                schema: "social",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "IsSpoiler",
                schema: "social",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "ParagraphId",
                schema: "social",
                table: "Comments");

            migrationBuilder.DropColumn(
                name: "ReplyCount",
                schema: "social",
                table: "Comments");
        }
    }
}
