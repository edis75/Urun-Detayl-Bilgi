import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ApiError, getProduct, getCategories } from '@/lib/api/catalog';
import { Breadcrumb } from '@/components/category/Breadcrumb';
import { ProductImage } from '@/components/common/ProductImage';
import { CompareButton } from '@/components/product/CompareButton';
import { money, attributeValue } from '@/utils/format';
type Props={params:Promise<{slug:string}>};
async function load(slug:string){try{const p=await getProduct(slug);if(!p.isActive)notFound();return p;}catch(e){if(e instanceof ApiError&&e.status===404)notFound();throw e;}}
export async function generateMetadata({params}:Props):Promise<Metadata>{const p=await load((await params).slug);return {title:p.name+' Özellikleri ve İncelemesi',description:p.shortDescription??p.name+' teknik özellikleri, fiyatı ve ürün detayları.'};}
export default async function ProductPage({params}:Props){
 const [p,categories]=await Promise.all([load((await params).slug),getCategories()]);
 const category=categories.find(c=>c.id===p.category.id);
 return <article className="container detail-page">{category&&<Breadcrumb category={category} categories={categories} productName={p.name}/>}<div className="product-hero"><div className="detail-image"><span className="category-label">{p.category.name}</span><ProductImage src={p.mainImageUrl} name={p.name}/></div><div className="detail-info"><span className="brand">{p.brand.name}</span><h1>{p.name}</h1>{p.modelCode&&<p className="model-code">Model kodu: {p.modelCode}</p>}<p>{p.shortDescription}</p><div className="detail-highlights">{p.attributes.slice(0,4).map(a=><div key={a.attributeId}><span>{a.name}</span><strong>{attributeValue(a)}</strong></div>)}</div><div className="detail-price"><small>Güncel fiyat</small><strong>{money(p.currentPrice,p.currency)}</strong></div><CompareButton/></div></div>
 <nav className="detail-tabs" aria-label="Ürün bölümleri"><a href="#teknik-ozellikler">Teknik özellikler</a>{p.description&&<a href="#aciklama">Ürün hakkında</a>}</nav>
 <section id="teknik-ozellikler" className="spec-section"><div><p className="eyebrow">TÜM DETAYLAR</p><h2>Teknik özellikler</h2><p>Ürünü daha yakından tanıyın.</p></div><dl className="spec-table">{p.attributes.map(a=><div key={a.attributeId}><dt>{a.name}</dt><dd>{attributeValue(a)}</dd></div>)}{!p.attributes.length&&<div>Bu ürün için henüz teknik özellik belirtilmedi.</div>}</dl></section>
 {p.description&&<section id="aciklama" className="description-section"><p className="eyebrow">ÜRÜN HAKKINDA</p><h2>{p.name}</h2><p>{p.description}</p></section>}</article>;
}

