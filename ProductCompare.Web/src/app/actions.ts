'use server';
import { ApiError, searchProducts } from '@/lib/api/catalog';
export async function findProducts(query:string){
 try{
  if(typeof query!=='string'||!query.trim())return {error:'Arama metni boş olamaz.'};
  return {items:await searchProducts(query.trim())};
 }catch(e){return {error:e instanceof ApiError?e.message:'Ürünler yüklenemedi.'};}
}
