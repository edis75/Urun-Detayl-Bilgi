'use server';
import { ApiError, getProducts } from '@/lib/api/catalog';
export async function findComparisonProducts(categoryId:number|undefined,search:string,page:number){
 try{
  if(categoryId!==undefined&&(!Number.isSafeInteger(categoryId)||categoryId<=0))return {error:'Geçersiz kategori.'};
  if(typeof search!=='string'||search.length>300||!Number.isSafeInteger(page)||page<1)return {error:'Geçersiz arama.'};
  return {result:await getProducts({categoryId,search,page,pageSize:20})};
 }catch(e){return {error:e instanceof ApiError?e.message:'Ürünler yüklenemedi.'};}
}
