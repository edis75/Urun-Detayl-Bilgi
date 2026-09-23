import type { Metadata } from 'next';
import { ApiError, getComparison } from '@/lib/api/catalog';
import { CompareView } from '@/components/compare/CompareView';
export const metadata:Metadata={title:'Ürün karşılaştırma'};
export default async function ComparePage({searchParams}:{searchParams:Promise<{products?:string|string[]}>}){
 const query=(await searchParams).products;
 const raw=Array.isArray(query)?query.join(','):query;
 let comparison=null, error='';
 if(raw!==undefined){try{comparison=await getComparison(raw);}catch(e){error=e instanceof ApiError?e.message:'Karşılaştırma yüklenemedi. Lütfen tekrar deneyin.';}}
 return <CompareView key={raw??''} comparison={comparison} error={error}/>;
}
