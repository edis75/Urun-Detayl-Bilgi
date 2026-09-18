using ProductCompare.Api.Enums;
namespace ProductCompare.Api.DTOs.Attributes;

public record AttributeResponse(long Id, string Name, string Code, AttributeDataType DataType, string? Unit, string? Description, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
