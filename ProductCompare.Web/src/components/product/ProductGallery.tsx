'use client';
import { useState } from 'react';
import type { ProductImage as ImageData } from '@/types/catalog';
import { ProductImage } from '@/components/common/ProductImage';

export function ProductGallery({images=[],fallback,name}:{images?:ImageData[];fallback:string|null;name:string}){
 const ordered=[...images].sort((a,b)=>Number(b.isPrimary)-Number(a.isPrimary)||a.sortOrder-b.sortOrder||a.id-b.id);
 const [selectedId,setSelectedId]=useState<number|null>(null);
 const selected=ordered.find(image=>image.id===selectedId)??ordered[0];
 const src=selected?.imageUrl??fallback;
 return <div className="product-gallery"><div className="product-gallery-main"><ProductImage key={src} src={src} name={name}/></div>
 {ordered.length>1&&<div className="product-thumbnails" role="group" aria-label="Ürün görselleri">{ordered.map((image,index)=><button type="button" key={image.id} aria-label={`${name}, görsel ${index+1}`} aria-pressed={selected?.id===image.id} onClick={()=>setSelectedId(image.id)}><ProductImage key={image.imageUrl} src={image.imageUrl} name={`${name}, görsel ${index+1}`}/></button>)}</div>}
 </div>;
}
