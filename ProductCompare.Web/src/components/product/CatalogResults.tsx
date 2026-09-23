import Link from 'next/link';
import type { CatalogQuery } from '@/lib/api/catalog';
import type { ProductSearchResponse } from '@/types/catalog';
import { ProductCard } from './ProductCard';
import { FilterSidebar } from './FilterSidebar';

export function CatalogResults({response,query,action,categoryPage=false}:{response:ProductSearchResponse;query:CatalogQuery;action:string;categoryPage?:boolean}){
 const href=(changes:Record<string,string|undefined>)=>{
  const params=new URLSearchParams();
  Object.entries({...query,...changes}).forEach(([key,value])=>{if(value!==undefined&&value!=='')for(const v of Array.isArray(value)?value:[value])params.append(key,v);});
  return action+'?'+params;
 };
 const pages=Math.max(1,Math.min(Math.ceil(response.total/response.pageSize),Math.floor(10000/response.pageSize)));
 return <>
  {!categoryPage&&response.categoryContext&&<p><Link href={'/kategori/'+response.categoryContext.slug}>{response.categoryContext.name} kategorisini keşfet →</Link></p>}
  {!!response.facets.children.length&&<section aria-label="Alt kategoriler" className="child-categories">{response.facets.children.map(c=><Link className="button" key={c.id} href={'/kategori/'+c.slug}>{c.name}</Link>)}</section>}
  {!categoryPage&&<nav aria-label="Kategori filtreleri" className="child-categories">{query.categoryId&&<Link className="button" href={action+'?'+new URLSearchParams({q:String(query.q??'')})}>Tüm kategoriler</Link>}{response.facets.categories.map(c=><Link className="button" key={c.id} href={action+'?'+new URLSearchParams({q:String(query.q??''),categoryId:String(c.id)})}>{c.name}</Link>)}</nav>}
  <p className="subtle">{response.total} ürün</p>
  <div className="catalog-layout"><FilterSidebar facets={response.facets} query={query} action={action} categoryId={!categoryPage?(query.categoryId?Number(query.categoryId):response.categoryContext?.id):undefined}/><div>
   <div className="product-grid">{response.products.map(p=><ProductCard key={p.id} product={p}/>)}</div>
   {!response.products.length&&<div className="empty">Bu filtrelerle eşleşen ürün bulunamadı.</div>}
   <nav className="pagination" aria-label="Sayfalama">{response.page>1?<Link className="button" href={href({page:String(response.page-1)})}>← Önceki</Link>:<span/>}<span>Sayfa {response.page} / {pages}</span>{response.page<pages?<Link className="button" href={href({page:String(response.page+1)})}>Sonraki →</Link>:<span/>}</nav>
  </div></div>
 </>;
}
