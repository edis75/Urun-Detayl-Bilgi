import 'server-only';
import { cache } from 'react';
import type { Category, Brand, Product, Page, ProductFilters } from '@/types/catalog';
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
async function get<T>(path:string):Promise<T>{
 const base=process.env.NEXT_PUBLIC_API_BASE_URL;
 if(!base)throw new Error('API adresi yapılandırılmamış.');
 let response:Response;
 try { response=await fetch(base.replace(/\/$/,'')+path,{cache:'no-store',signal:AbortSignal.timeout(15000)}); }
 catch { throw new ApiError(503,'Kataloğa şu anda ulaşılamıyor.'); }
 if(!response.ok)throw new ApiError(response.status,response.status===404?'Kayıt bulunamadı.':'Katalog yüklenemedi.');
 return response.json() as Promise<T>;
}
export const getCategories=cache(()=>get<Category[]>('/api/categories'));
export const getBrands=cache(()=>get<Brand[]>('/api/brands'));
export const getProduct=cache((slug:string)=>get<Product>('/api/products/by-slug/'+encodeURIComponent(slug)));
export async function getProducts(filters:ProductFilters={}){
 const query=new URLSearchParams();
 Object.entries({...filters,isActive:true}).forEach(([k,v])=>{if(v!==undefined)query.set(k,String(v));});
 return get<Page<Product>>('/api/products?'+query);
}
export async function getCategory(slug:string){return (await getCategories()).find(c=>c.slug===slug&&c.isActive);}

