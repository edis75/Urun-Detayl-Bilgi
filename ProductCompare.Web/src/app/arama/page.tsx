import { searchCatalog, type CatalogQuery } from '@/lib/api/catalog';
import { CatalogResults } from '@/components/product/CatalogResults';
export const metadata={title:'Ürün ara'};
export default async function SearchPage({searchParams}:{searchParams:Promise<CatalogQuery>}){
 const query=await searchParams;
 const q=String(query.q??'').trim();
 const response=q||query.categoryId?await searchCatalog(query):null;
 return <div className="container category-page"><h1>Ürün ara</h1><form action="/arama" className="catalog-toolbar"><input name="q" aria-label="Ürün ara" defaultValue={q} placeholder="Ürün, marka veya kategori" maxLength={300}/><button className="button primary">Ara</button></form>{response?<CatalogResults response={response} query={query} action="/arama"/>:<p>Ürün, marka veya kategori adı girin.</p>}</div>;
}
