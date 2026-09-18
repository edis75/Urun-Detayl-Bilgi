'use client';
import { useState } from 'react';
export function ProductImage({src,name}:{src:string|null;name:string}){
 const [failed,setFailed]=useState(false);
 return src&&!failed?<img src={src} alt={name} className="product-image" loading="lazy" onError={()=>setFailed(true)}/>:<div className="image-placeholder"><svg width="52" height="64" viewBox="0 0 52 64" fill="none" aria-hidden="true"><rect x="11" y="3" width="30" height="56" rx="6" stroke="currentColor" strokeWidth="1.6"/><path d="M21 8h10M23 53h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg><span>Ürün görseli bulunamadı</span></div>;
}

