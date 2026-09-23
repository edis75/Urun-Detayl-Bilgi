'use client';
import { startTransition, useEffect, useState } from 'react';
import { findProducts } from '@/app/actions';
import type { Product, Category } from '@/types/catalog';
import Link from 'next/link';
import { ProductCard } from './ProductCard';
export function CatalogExplorer({products,categories}:{products:Product[];categories:Category[]}){
 const [search,setSearch]=useState('');
 const query=search.trim();
 const [response,setResponse]=useState<{query:string;items:Product[];error?:string}|null>(null);
 useEffect(()=>{
  if(!query)return;
  let active=true;
  const timer=setTimeout(()=>startTransition(async()=>{
   try{
    const data=await findProducts(query);
    if(active)setResponse({query,items:data.items??[],error:data.error});
   }catch{if(active)setResponse({query,items:[],error:'Ürünler yüklenemedi.'});}
  }),300);
  return ()=>{active=false;clearTimeout(timer);};
 },[query]);
 const current=response?.query===query?response:null;
 const loading=!!query&&!current;
 const error=query?current?.error:undefined;
 const result=query?current?.items??[]:products;
 return <><section className="hero"><div className="container"><div className="hero-kicker"><span/>DAHA BİLİNÇLİ BİR SEÇİM</div><h1>Detayları keşfet.<br/><em>Doğru ürünü seç.</em></h1><p>Teknik özellikler ve ürün detayları.<br/>Merak ettiğin her şey, tek bir yerde.</p><div id="urun-ara" className="hero-search"><span aria-hidden="true">⌕</span><input aria-label="Görüntülenen ürünlerde ara" placeholder="Hangi ürünü keşfetmek istersin?" value={search} onChange={e=>{setSearch(e.target.value);if(e.target.value.trim()!==query)setResponse(null);}}/><a className="button primary" href="#urunler">Ürünleri keşfet <span>→</span></a></div><small className="search-note">Ürün adı, marka veya kategoriye göre arama yapın.</small><div className="hero-bottom"><span>Teknik özellikleri keşfet</span><span>Ürünleri karşılaştır</span><span>Seçimini kolaylaştır</span></div><div className="hero-art" aria-hidden="true"><div className="art-orbit"/><div className="art-device"><span/><span/><span/><div/></div><div className="art-chip">Detaylarda fark var. <b>↗</b></div></div></div></section>
 <section id="kategoriler" className="container categories-section"><div className="section-heading"><div><p className="eyebrow">KEŞFETMEYE BAŞLA</p><h2>Kategorilere göz at</h2></div><span className="subtle">{categories.length} kategori</span></div><div className="category-grid">{categories.map((c,i)=><Link key={c.id} href={'/kategori/'+c.slug} className="category-card"><span className="category-icon" aria-hidden="true">{['▧','▯','▱'][i%3]}</span><span><strong>{c.name}</strong><small>Ürünleri keşfet</small></span><b>↗</b></Link>)}</div>{!categories.length&&<div className="empty">Henüz kategori bulunmuyor.</div>}</section>
 <section id="urunler" className="container products-section"><div className="section-heading"><div><p className="eyebrow">KATALOGDAN SEÇTİKLERİMİZ</p><h2>{search?'Arama sonuçları':'Ürünleri yakından tanı'}</h2></div><span className="subtle">{result.length} ürün{query&&<Link href={'/arama?q='+encodeURIComponent(query)}> · Filtrele ve tüm sonuçları gör →</Link>}</span></div><div className="product-grid">{result.map(p=><ProductCard key={p.id} product={p}/>)}</div>{loading&&<div className="empty" role="status">Ürünler yükleniyor…</div>}{error&&<div className="empty" role="alert">{error}</div>}{!loading&&!error&&!result.length&&<div className="empty">Bu sayfada eşleşen ürün bulunamadı. Kategorilere göz atabilirsiniz.</div>}</section></>;
}
