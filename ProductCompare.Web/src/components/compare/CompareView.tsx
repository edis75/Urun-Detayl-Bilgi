'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Comparison, Product } from '@/types/catalog';
import { ProductImage } from '@/components/common/ProductImage';
import { CompareProductPicker } from './CompareProductPicker';

export function CompareView({comparison,error}:{comparison:Comparison|null;error:string}){
 const router=useRouter();
 const [pending,startTransition]=useTransition();
 const [picking,setPicking]=useState(false);
 const ids=comparison?.products.map(p=>p.id)??[];
 function navigate(next:number[]){setPicking(false);startTransition(()=>router.push('/compare'+(next.length?'?products='+next.join(','):''),{scroll:false}));}
 function add(product:Product){if(pending||ids.length>=4||ids.includes(product.id)||(comparison&&product.category.id!==comparison.category.id))return;navigate([...ids,product.id]);}
 return <section className="container compare-page" aria-busy={pending}>
  <div className="section-heading"><div><p className="eyebrow">DETAYLARI YAN YANA KEŞFET</p><h1>Ürün karşılaştırma</h1>{comparison&&<p>{comparison.category.name} · {ids.length}/4 ürün</p>}</div>
   {!error&&<button disabled={pending||ids.length>=4} onClick={()=>setPicking(true)}>{ids.length>=4?'4 ürün seçildi':'+ Ürün Ekle'}</button>}
  </div>
  {pending&&<p role="status">Karşılaştırma yükleniyor...</p>}
  {error?<div className="empty"><p role="alert">{error}</p><button onClick={()=>startTransition(()=>router.refresh())} disabled={pending}>Tekrar dene</button><Link className="button" href="/compare">Yeni karşılaştırma</Link></div>:!comparison?<div className="empty"><p>Karşılaştırmak için ürün ekleyin.</p><button className="primary" onClick={()=>setPicking(true)} disabled={pending}>Ürün Seç</button></div>:<>
   {ids.length===1&&<p>Karşılaştırmak için bir ürün daha ekleyin.</p>}
   <div className="compare-scroll" tabIndex={0} role="region" aria-label="Ürün karşılaştırma tablosu, yatay kaydırılabilir">
    <table className="compare-table"><caption className="compare-caption">{comparison.category.name} ürünlerinin teknik özellikleri</caption><thead><tr><th scope="col">Özellik</th>{comparison.products.map(p=><th scope="col" key={p.id}><div className="compare-product">
     <button className="compare-remove" aria-label={p.name+' ürününü kaldır'} disabled={pending} onClick={()=>navigate(ids.filter(id=>id!==p.id))}>×</button>
     <div className="compare-image"><ProductImage src={p.mainImageUrl} name={p.name}/></div><span className="brand">{p.brandName}</span><Link href={'/urun/'+p.slug}>{p.name}</Link>
    </div></th>)}</tr></thead><tbody>{comparison.attributes.map(a=><tr key={a.attributeId}><th scope="row">{a.name}</th>{comparison.products.map(p=><td key={p.id}>{a.values.find(v=>v.productId===p.id)?.value??'—'}</td>)}</tr>)}</tbody></table>
   </div>
   {!comparison.attributes.length&&<p className="empty">Bu kategori için karşılaştırılabilir özellik bulunmuyor.</p>}
  </>}
  {picking&&<CompareProductPicker categoryId={comparison?.category.id} selectedIds={ids} onSelect={add} onClose={()=>setPicking(false)}/>}
 </section>;
}
