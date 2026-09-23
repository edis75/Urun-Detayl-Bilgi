import 'server-only';
import { cache } from 'react';
import type { Category, CategoryNode, CategoryDetail, Brand, Product, Page, ProductFilters, Comparison, ProductSearchResponse } from '@/types/catalog';
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
async function get<T>(path:string):Promise<T>{
 const base=process.env.NEXT_PUBLIC_API_BASE_URL;
 if(!base)throw new Error('API adresi yapılandırılmamış.');
 let response:Response;
 try { response=await fetch(base.replace(/\/$/,'')+path,{cache:'no-store',signal:AbortSignal.timeout(15000)}); }
 catch { throw new ApiError(503,'Kataloğa şu anda ulaşılamıyor.'); }
 if(!response.ok){
  const error=await response.json().catch(()=>null);
  throw new ApiError(response.status,error?.errors?.[0]||error?.message||(response.status===404?'Kayıt bulunamadı.':'Katalog yüklenemedi.'));
 }
 return response.json() as Promise<T>;
}
export const getCategories=cache(()=>get<Category[]>('/api/categories'));
export const getCategoryTree=cache(()=>get<CategoryNode[]>('/api/categories/tree'));
export const getBrands=cache(()=>get<Brand[]>('/api/brands'));
export const getProduct=cache((slug:string)=>get<Product>('/api/products/by-slug/'+encodeURIComponent(slug)));
export const getComparison=(productIds:string)=>get<Comparison>('/api/compare?productIds='+encodeURIComponent(productIds));
export async function searchProducts(query:string){
 return (await searchCatalog({q:query})).products;
}
export type CatalogQuery=Record<string,string|string[]|undefined>;
export async function searchCatalog(filters:CatalogQuery,categoryId?:number){
 const query=new URLSearchParams({page:'1',pageSize:'24',isActive:'true'});
 Object.entries(filters).forEach(([key,value])=>{
  if(value===undefined||value==='')return;
  if(['q','page','sort','categoryId','brandIds'].includes(key)||/^filters\[[^\]]+\]$/.test(key)){
   query.delete(key);for(const item of Array.isArray(value)?value:[value])query.append(key,item);
  }
 });
 if(categoryId)query.set('categoryId',String(categoryId));
 return get<ProductSearchResponse>('/api/search?'+query);
}
export async function getProducts(filters:ProductFilters={}){
 const query=new URLSearchParams();
 Object.entries({...filters,isActive:true}).forEach(([k,v])=>{if(v!==undefined)query.set(k,String(v));});
 return get<Page<Product>>('/api/products?'+query);
}
export const getCategory=cache(async(slug:string)=>{
 try{return await get<CategoryDetail>('/api/categories/by-slug/'+encodeURIComponent(slug));}
 catch(error){if(error instanceof ApiError&&error.status===404)return undefined;throw error;}
});
