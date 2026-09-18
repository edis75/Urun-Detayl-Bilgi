import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { brandsApi } from '../../api/brandsApi';
import type { Brand, BrandRequest } from '../../types/catalog';
import { PageTitle, ErrorNotice, Loading, Empty, Status, DeleteButton } from '../../components/common/Ui';
import { Field, Check } from '../../components/forms/Fields';
import { text } from '../../utils/forms';
export function Brands() {
 const [editing,setEditing]=useState<Brand|null|undefined>(undefined);const [notice,setNotice]=useState('');
 const qc=useQueryClient();const query=useQuery({queryKey:['brands'],queryFn:brandsApi.list});
 const save=useMutation({mutationFn:({id,data}:{id:number|null;data:BrandRequest})=>brandsApi.save(id,data),onSuccess:()=>{void qc.invalidateQueries({queryKey:['brands']});setEditing(undefined);setNotice('Marka kaydedildi.');}});
 const remove=useMutation({mutationFn:brandsApi.remove,onSuccess:()=>{void qc.invalidateQueries({queryKey:['brands']});setNotice('Marka silindi.');}});
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);save.mutate({id:editing?.id??null,data:{name:text(d,'name'),isActive:d.has('isActive')}});}
 return <><PageTitle title="Markalar" description="Kataloğunuzdaki markaları ve yayın durumlarını yönetin." action={<button className="primary" onClick={()=>{setEditing(null);save.reset();}}>+ Yeni marka</button>}/>{notice&&<div role="status" className="notice success">{notice}</div>}<ErrorNotice error={query.error||save.error||remove.error}/>
 {editing!==undefined&&<section className="panel"><h2>{editing?'Markayı düzenle':'Yeni marka'}</h2><form key={editing?.id??'new'} onSubmit={submit} className="form-grid"><Field label="Marka adı"><input name="name" required maxLength={150} defaultValue={editing?.name}/></Field><Check name="isActive" label="Aktif" value={editing?.isActive??true}/><div className="form-actions"><button className="primary" disabled={save.isPending}>Kaydet</button><button type="button" onClick={()=>setEditing(undefined)}>Vazgeç</button></div></form></section>}
 {query.isPending?<Loading/>:<section className="panel table-wrap"><table><thead><tr><th>Marka</th><th>Slug</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>{query.data?.map(b=><tr key={b.id}><td><strong>{b.name}</strong></td><td className="muted">{b.slug}</td><td><Status active={b.isActive}/></td><td><div className="actions"><button className="small" onClick={()=>{setEditing(b);save.reset();}}>Düzenle</button><DeleteButton pending={remove.isPending} onDelete={()=>remove.mutate(b.id)}/></div></td></tr>)}</tbody></table>{query.data?.length===0&&<Empty/>}</section>}</>;
}
