using Microsoft.EntityFrameworkCore;
using ProductCompare.Api.Entities;
namespace ProductCompare.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<AttributeDefinition> AttributeDefinitions => Set<AttributeDefinition>();
    public DbSet<CategoryAttribute> CategoryAttributes => Set<CategoryAttribute>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductAttributeValue> ProductAttributeValues => Set<ProductAttributeValue>();
    protected override void OnModelCreating(ModelBuilder m)
    {
        var c = m.Entity<Category>(); c.HasKey(x => x.Id);
        c.Property(x => x.Name).IsRequired().HasMaxLength(200);
        c.Property(x => x.Slug).IsRequired().HasMaxLength(250); c.HasIndex(x => x.Slug).IsUnique();
        c.Property(x => x.IsActive).HasDefaultValue(true); c.Property(x => x.DisplayOrder).HasDefaultValue(0);
        c.HasOne(x => x.ParentCategory).WithMany(x => x.Children).HasForeignKey(x => x.ParentCategoryId).OnDelete(DeleteBehavior.Restrict);
        var b = m.Entity<Brand>(); b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(150);
        b.Property(x => x.Slug).IsRequired().HasMaxLength(180); b.HasIndex(x => x.Slug).IsUnique();
        b.Property(x => x.IsActive).HasDefaultValue(true);
        var a = m.Entity<AttributeDefinition>(); a.HasKey(x => x.Id);
        a.Property(x => x.Name).IsRequired().HasMaxLength(150); a.Property(x => x.Code).IsRequired().HasMaxLength(150);
        a.HasIndex(x => x.Code).IsUnique(); a.Property(x => x.Unit).HasMaxLength(50); a.Property(x => x.Description).HasMaxLength(500);
        a.ToTable(t => t.HasCheckConstraint("CK_Attribute_DataType", "\"DataType\" BETWEEN 1 AND 4"));
        var ca = m.Entity<CategoryAttribute>(); ca.HasKey(x => new { x.CategoryId, x.AttributeDefinitionId });
        ca.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        ca.HasOne(x => x.AttributeDefinition).WithMany().HasForeignKey(x => x.AttributeDefinitionId).OnDelete(DeleteBehavior.Restrict);
        var p = m.Entity<Product>(); p.HasKey(x => x.Id);
        p.HasOne(x => x.Category).WithMany().HasForeignKey(x => x.CategoryId).OnDelete(DeleteBehavior.Restrict);
        p.HasOne(x => x.Brand).WithMany().HasForeignKey(x => x.BrandId).OnDelete(DeleteBehavior.Restrict);
        p.Property(x => x.Name).IsRequired().HasMaxLength(300); p.Property(x => x.Slug).IsRequired().HasMaxLength(350);
        p.HasIndex(x => x.Slug).IsUnique(); p.HasIndex(x => x.IsActive);
        p.Property(x => x.ModelCode).HasMaxLength(150); p.Property(x => x.ShortDescription).HasMaxLength(1000);
        p.Property(x => x.Description).HasColumnType("text"); p.Property(x => x.CurrentPrice).HasPrecision(18, 2);
        p.Property(x => x.Currency).IsRequired().HasMaxLength(3).HasDefaultValue("TRY");
        p.Property(x => x.MainImageUrl).HasMaxLength(2048); p.Property(x => x.IsActive).HasDefaultValue(true);
        p.ToTable(t => t.HasCheckConstraint("CK_Product_Price", "\"CurrentPrice\" >= 0"));
        var v = m.Entity<ProductAttributeValue>(); v.HasKey(x => new { x.ProductId, x.AttributeDefinitionId });
        v.HasOne(x => x.Product).WithMany(x => x.AttributeValues).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
        v.HasOne(x => x.AttributeDefinition).WithMany().HasForeignKey(x => x.AttributeDefinitionId).OnDelete(DeleteBehavior.Restrict);
        v.Property(x => x.NumericValue).HasColumnType("numeric"); v.Property(x => x.TextValue).HasColumnType("text");
        v.Property(x => x.DateValue).HasColumnType("timestamp with time zone");
        v.ToTable(t => t.HasCheckConstraint("CK_Value_ExactlyOne", "num_nonnulls(\"TextValue\", \"NumericValue\", \"BooleanValue\", \"DateValue\") = 1"));
    }
    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        foreach (var e in ChangeTracker.Entries<CatalogEntity>())
        {
            if (e.State == EntityState.Added) e.Entity.CreatedAtUtc = now;
            if (e.State is EntityState.Added or EntityState.Modified) e.Entity.UpdatedAtUtc = now;
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
