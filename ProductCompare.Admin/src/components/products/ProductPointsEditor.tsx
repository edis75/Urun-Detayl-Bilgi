import { Check, X, Plus, Trash2 } from 'lucide-react';

export function ProductPointsEditor({kind,values,onChange}:{kind:'pros'|'cons';values:string[];onChange:(values:string[])=>void}){
 const positive=kind==='pros';const title=positive?'Artıları':'Eksileri';const item=positive?'Artı':'Eksi';const Icon=positive?Check:X;
 return <section className="product-points-editor" aria-label={title}><h3>{title}</h3>
 {values.map((value,index)=><div className="product-point-row" key={index}><Icon size={18} aria-hidden="true"/><input aria-label={`${item} ${index+1}`} value={value} onChange={e=>onChange(values.map((v,i)=>i===index?e.target.value:v))}/><button type="button" aria-label={`${item} ${index+1} sil`} onClick={()=>onChange(values.filter((_,i)=>i!==index))}><Trash2 size={16} aria-hidden="true"/>Sil</button></div>)}
 <button type="button" onClick={()=>onChange([...values,''])}><Plus size={16} aria-hidden="true"/>Yeni {item} Ekle</button></section>;
}
