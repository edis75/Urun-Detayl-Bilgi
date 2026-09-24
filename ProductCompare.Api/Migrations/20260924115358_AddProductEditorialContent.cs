using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductCompare.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductEditorialContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProductContents",
                columns: table => new
                {
                    ProductId = table.Column<long>(type: "bigint", nullable: false),
                    ContentHtml = table.Column<string>(type: "text", nullable: false),
                    Pros = table.Column<string[]>(type: "text[]", nullable: false),
                    Cons = table.Column<string[]>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductContents", x => x.ProductId);
                    table.ForeignKey(
                        name: "FK_ProductContents_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProductContents");
        }
    }
}
