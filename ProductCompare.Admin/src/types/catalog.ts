export type AttributeDataType = 'Text' | 'Number' | 'Boolean' | 'Date';
export interface Category { pathName:string; isSelectable:boolean; id: number; name: string; slug: string; parentCategoryId: number | null; isActive: boolean; displayOrder: number; createdAtUtc: string; updatedAtUtc: string }
export interface Brand { id: number; name: string; slug: string; isActive: boolean; createdAtUtc: string; updatedAtUtc: string }
export interface AttributeDefinition { id: number; name: string; code: string; dataType: AttributeDataType; unit: string | null; description: string | null; createdAtUtc: string; updatedAtUtc: string }
export interface CategoryAttribute { attribute: AttributeDefinition; isRequired: boolean; isFilterable: boolean; isComparable: boolean; displayOrder: number }
export interface CategoryAttributeRequest { attributeDefinitionId: number; isRequired: boolean; isFilterable: boolean; isComparable: boolean; displayOrder: number }
export interface TechnicalAttribute { attributeId: number; name: string; code: string; dataType: AttributeDataType; value: string | number | boolean | null; unit: string | null }
export interface CatalogReference { id: number; name: string; slug: string }
export interface ProductImage { id:number; imageUrl:string; isPrimary:boolean; sortOrder:number }
export interface ProductDetail extends Product { images: ProductImage[]; contentHtml: string; pros: string[]; cons: string[] }
export interface Product { id: number; name: string; slug: string; modelCode: string | null; category: CatalogReference; brand: CatalogReference; shortDescription: string | null; description: string | null; mainImageUrl: string | null; isActive: boolean; createdAtUtc: string; updatedAtUtc: string; attributes: TechnicalAttribute[]; summaryAttributes: TechnicalAttribute[] }
export interface ProductAttributeValueRequest { attributeDefinitionId: number; textValue?: string; numericValue?: number; booleanValue?: boolean; dateValue?: string }
export interface ProductRequest { contentHtml: string; pros: string[]; cons: string[]; categoryId: number; brandId: number; name: string; modelCode: string | null; shortDescription: string | null; description: string | null; mainImageUrl: string | null; isActive: boolean; attributes: ProductAttributeValueRequest[] }
export interface Page<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number }
export interface ProductFilters { categoryId?: number; brandId?: number; isActive?: boolean; page?: number; pageSize?: number }
export type CategoryRequest = Pick<Category, 'name' | 'parentCategoryId' | 'isActive' | 'displayOrder'> & {slug?:string};
export type BrandRequest = Pick<Brand, 'name' | 'isActive'>;
export type AttributeRequest = Pick<AttributeDefinition, 'name' | 'code' | 'dataType' | 'unit' | 'description'>;

