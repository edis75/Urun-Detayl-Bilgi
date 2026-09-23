import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, searchCatalog, type CatalogQuery } from '@/lib/api/catalog';
import { CatalogResults } from '@/components/product/CatalogResults';
type Props={params:Promise<{slug:string}>;searchParams:Promise<CatalogQuery>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const c=await getCategory((await params).slug);return {title:c?.name??'Kategori bulunamadı'};}
export default async function CategoryPage({params,searchParams}:Props){
 const c=await getCategory((await params).slug);if(!c)notFound();
 const query=await searchParams;
 const response=await searchCatalog(query,c.id);
 return <div className="container category-page">
  <nav className="breadcrumb" aria-label="İçerik yolu"><Link href="/">Ana Sayfa</Link>{c.breadcrumb.map(p=><span key={p.id}> / <Link href={'/kategori/'+p.slug}>{p.name}</Link></span>)}</nav>
  <div className="section-heading category-heading"><div><p className="eyebrow">ÜRÜN KATALOĞU</p><h1>{c.name}</h1><p>Detayları incele, sana uygun ürünü keşfet.</p></div></div>
  <CatalogResults response={response} query={query} action={'/kategori/'+c.slug} categoryPage/>
 </div>;
}
