'use client';
import { useEffect, useRef, useState } from 'react';
import type { Page, Product } from '@/types/catalog';
import { findComparisonProducts } from '@/app/compare/actions';
import { ProductImage } from '@/components/common/ProductImage';

export function CompareProductPicker({categoryId,selectedIds,onSelect,onClose}:{categoryId?:number;selectedIds:number[];onSelect:(p:Product)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [search,setSearch]=useState(''), [page,setPage]=useState(1);
 const [result,setResult]=useState<Page<Product>|null>(null), [error,setError]=useState(''), [loading,setLoading]=useState(true);
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';dialog.current?.showModal();
  return ()=>{document.body.style.overflow=overflow;previous?.focus();};
 },[]);
 useEffect(()=>{
  let active=true;
  const timer=setTimeout(async()=>{
   try{const response=await findComparisonProducts(categoryId,search,page);if(active){setResult(response.result??null);setError(response.error??'');}}
   catch{if(active){setResult(null);setError('Ürünler yüklenemedi. Lütfen tekrar deneyin.');}}
   finally{if(active)setLoading(false);}
  },250);
  return ()=>{active=false;clearTimeout(timer);};
 },[categoryId,search,page]);
 return <dialog ref={dialog} className="compare-picker" aria-labelledby="picker-title" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div className="picker-content"><div className="section-heading"><h2 id="picker-title">Ürün Ekle</h2><button aria-label="Ürün seçiciyi kapat" onClick={onClose}>×</button></div>
   <label htmlFor="compare-search">Ürün adıyla ara</label><input id="compare-search" autoFocus maxLength={300} placeholder="Ürün ara..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1);setLoading(true);}}/>
   <p>{categoryId?'Yalnızca aynı kategorideki ürünler gösteriliyor.':'İlk ürün, karşılaştırmanın kategorisini belirler.'}</p>
   <div className="picker-results" aria-busy={loading}>{loading?<p role="status">Ürünler yükleniyor...</p>:error?<p role="alert">{error}</p>:<>
    {result?.items.map(p=><button className="picker-product" key={p.id} disabled={selectedIds.includes(p.id)} onClick={()=>onSelect(p)}><div className="picker-image"><ProductImage src={p.mainImageUrl} name={p.name}/></div><span><strong>{p.name}</strong>{selectedIds.includes(p.id)&&<small>Karşılaştırmaya eklendi</small>}</span></button>)}
    {!result?.items.length&&<p>Aramanıza uygun ürün bulunamadı.</p>}
   </>}</div>
   <div className="pagination"><button disabled={loading||page===1} onClick={()=>{setPage(page-1);setLoading(true);}}>Önceki</button><span>Sayfa {page}</span><button disabled={loading||!result||page>=result.totalPages} onClick={()=>{setPage(page+1);setLoading(true);}}>Sonraki</button></div>
  </div>
 </dialog>;
}
