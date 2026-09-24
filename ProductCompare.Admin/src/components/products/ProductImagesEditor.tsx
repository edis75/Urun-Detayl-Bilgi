import { useEffect, useState } from 'react';
import type { ProductImage } from '../../types/catalog';
import { productsApi } from '../../api/productsApi';
import { ErrorNotice } from '../common/Ui';

export interface PendingProductImage { id:string; file:File }
function Preview({file}:{file:File}){
 const [url,setUrl]=useState('');
 useEffect(()=>{const next=URL.createObjectURL(file);setUrl(next);return ()=>URL.revokeObjectURL(next);},[file]);
 return url?<img src={url} alt={file.name}/>:null;
}
export function ProductImagesEditor({productId,images,pending,primaryId,disabled,onImages,onPending,onPrimary,onBusy}:{
 productId?:number;images:ProductImage[];pending:PendingProductImage[];primaryId:string|null;disabled:boolean;
 onImages:(images:ProductImage[])=>void;onPending:(files:PendingProductImage[])=>void;onPrimary:(id:string|null)=>void;onBusy:(busy:boolean)=>void;
}){
 const [error,setError]=useState<unknown>(null);
 async function change(action:()=>Promise<ProductImage[]>){
  onBusy(true);setError(null);
  try{onImages(await action());}catch(e){setError(e);}finally{onBusy(false);}
 }
 return <section className="panel product-images-editor"><h2>Ürün Görselleri</h2><p>JPG, PNG veya WebP. Dosya başına en fazla 10 MB, bir kayıtta en fazla 10 yeni görsel. Yeni görseller ürün kaydedildiğinde yüklenir.</p>
 <ErrorNotice error={error}/>
 <label className="image-file-label">Dosya seç<input type="file" multiple accept=".jpg,.jpeg,.png,.webp" disabled={disabled} onChange={e=>{
  const files=Array.from(e.target.files??[]);e.target.value='';
  if(files.length+pending.length>10){setError(new Error('Bir kayıtta en fazla 10 yeni görsel seçebilirsiniz.'));return;}
  const next=[...pending,...files.map(file=>({id:crypto.randomUUID(),file}))];onPending(next);setError(null);
  if(!images.length&&!primaryId&&next.length)onPrimary(next[0].id);
 }}/></label>
 <div className="admin-image-grid">
 {images.map(image=><div className="admin-image-card" key={image.id}><img src={image.imageUrl} alt="Kayıtlı ürün görseli"/><label><input type="radio" name="product-cover" checked={!primaryId&&image.isPrimary} disabled={disabled} onChange={()=>{onPrimary(null);if(productId&&!image.isPrimary)void change(()=>productsApi.setPrimaryImage(productId,image.id));}}/>Kapak Görseli</label><button type="button" disabled={disabled} onClick={()=>{if(productId)void change(()=>productsApi.deleteImage(productId,image.id));}}>Görseli sil</button></div>)}
 {pending.map(image=><div className="admin-image-card" key={image.id}><Preview file={image.file}/><small>{image.file.name}</small><span className="badge">Yüklenecek</span><label><input type="radio" name="product-cover" checked={primaryId===image.id} disabled={disabled} onChange={()=>onPrimary(image.id)}/>Kapak Görseli</label><button type="button" disabled={disabled} onClick={()=>{const next=pending.filter(item=>item.id!==image.id);onPending(next);if(primaryId===image.id)onPrimary(images.length?null:next[0]?.id??null);}}>Seçimden kaldır</button></div>)}
 </div>
 {!!images.length&&<p>Mevcut görselleri silme ve kapak değiştirme işlemleri hemen uygulanır.</p>}
 </section>;
}
