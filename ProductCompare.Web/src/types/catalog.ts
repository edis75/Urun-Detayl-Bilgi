export type AttributeDataType = 'Text' | 'Number' | 'Boolean' | 'Date';
export interface Category { id: number; name: string; slug: string; parentCategoryId: number | null; isActive: boolean; displayOrder: number; createdAtUtc: string; updatedAtUtc: string }
export interface Brand { id: number; name: string; slug: string; isActive: boolean; createdAtUtc: string; updatedAtUtc: string }
export interface AttributeDefinition { id: number; name: string; code: string; dataType: AttributeDataType; unit: string | null; description: string | null; createdAtUtc: string; updatedAtUtc: string }
export interface CategoryAttribute { attribute: AttributeDefinition; isRequired: boolean; isFilterable: boolean; isComparable: boolean; displayOrder: number }
export interface CategoryAttributeRequest { attributeDefinitionId: number; isRequired: boolean; isFilterable: boolean; isComparable: boolean; displayOrder: number }
export interface TechnicalAttribute { attributeId: number; name: string; code: string; dataType: AttributeDataType; value: string | number | boolean | null; unit: string | null }
export interface CatalogReference { id: number; name: string; slug: string }
export interface Product { id: number; name: string; slug: string; modelCode: string | null; category: CatalogReference; brand: CatalogReference; shortDescription: string | null; description: string | null; mainImageUrl: string | null; isActive: boolean; createdAtUtc: string; updatedAtUtc: string; attributes: TechnicalAttribute[]; summaryAttributes: TechnicalAttribute[] }
export interface ProductAttributeValueRequest { attributeDefinitionId: number; textValue?: string; numericValue?: number; booleanValue?: boolean; dateValue?: string }
export interface ProductRequest { categoryId: number; brandId: number; name: string; modelCode: string | null; shortDescription: string | null; description: string | null; mainImageUrl: string | null; isActive: boolean; attributes: ProductAttributeValueRequest[] }
export interface Page<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number }
export interface ProductSearchItem { id:number; name:string; brandId:number; brandName:string; categoryId:number; categoryName:string; score:number|null }
export interface CategoryNode extends CatalogReference { children:CategoryNode[] }
export interface CategoryDetail extends CatalogReference { parent:Category|null; children:Category[]; breadcrumb:Category[] }
export interface CategoryFacet extends CatalogReference { count:number }
export interface SearchFacets { brands:{id:number;name:string;count:number}[]; categories:CategoryFacet[]; children:CategoryFacet[]; attributes:{code:string;name:string;unit:string|null;dataType:AttributeDataType;values:{value:string|number|boolean;count:number}[]}[] }
export interface ProductSearchResponse { total:number; page:number; pageSize:number; items:ProductSearchItem[]; products:Product[]; facets:SearchFacets; categoryContext:Category|null }
export interface ProductFilters { categoryId?: number; brandId?: number; isActive?: boolean; page?: number; pageSize?: number; search?: string }
export interface ComparisonProduct { id:number; name:string; slug:string; brandName:string; mainImageUrl:string|null }
export interface Comparison { category:CatalogReference; products:ComparisonProduct[]; attributes:{attributeId:number; name:string; code:string; unit:string|null; dataType:AttributeDataType; displayOrder:number; values:{productId:number; value:string}[]}[] }
export type CategoryRequest = Pick<Category, 'name' | 'parentCategoryId' | 'isActive' | 'displayOrder'>;
export type BrandRequest = Pick<Brand, 'name' | 'isActive'>;
export type AttributeRequest = Pick<AttributeDefinition, 'name' | 'code' | 'dataType' | 'unit' | 'description'>;
