import { useState, type ReactNode } from 'react';
import { ImageOff, LoaderCircle, Trash2 } from 'lucide-react';
import { errorMessage } from '../../api/apiClient';
export function ErrorNotice({ error }: { error: unknown }) { return error ? <div className="notice error" role="alert">{errorMessage(error)}</div> : null; }
export function Loading() { return <div className="empty" role="status"><LoaderCircle className="spin" size={24}/> Yükleniyor…</div>; }
export function Empty({ children = 'Henüz kayıt bulunmuyor.' }: { children?: ReactNode }) { return <div className="empty">{children}</div>; }
export function Status({ active }: { active: boolean }) { return <span className={'badge '+(active ? 'active' : '')}>{active ? 'Aktif' : 'Pasif'}</span>; }
export function PageTitle({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="page-title"><div><p className="eyebrow">KATALOG YÖNETİMİ</p><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
export function ProductImage({ src, name }: { src: string | null; name: string }) { const [failed,setFailed]=useState(false); return src && !failed ? <img className="product-image" src={src} alt={name} onError={()=>setFailed(true)}/> : <div className="image-placeholder" aria-label="Ürün görseli bulunamadı"><ImageOff size={22}/></div>; }
export function DeleteButton({ onDelete, pending = false }: { onDelete: () => void; pending?: boolean }) {
 const [confirm,setConfirm]=useState(false);
 return confirm ? <span className="confirm"><span>Silinsin mi?</span><button type="button" className="danger small" disabled={pending} onClick={()=>{onDelete();setConfirm(false);}}>Evet, sil</button><button type="button" className="small" onClick={()=>setConfirm(false)}>Vazgeç</button></span> : <button type="button" className="icon-button danger-text" aria-label="Sil" disabled={pending} onClick={()=>setConfirm(true)}><Trash2 size={16}/></button>;
}

