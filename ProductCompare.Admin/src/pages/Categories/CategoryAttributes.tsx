import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../../api/categoriesApi';
import { attributesApi } from '../../api/attributesApi';
import type { CategoryAttributeRequest } from '../../types/catalog';
import { PageTitle, ErrorNotice, Loading, Empty, DeleteButton } from '../../components/common/Ui';
import { Field, Check } from '../../components/forms/Fields';
export function CategoryAttributes() {
 const id=Number(useParams().id);const qc=useQueryClient();const [notice,setNotice]=useState('');
 const category=useQuery({queryKey:['categories',id],queryFn:()=>categoriesApi.get(id)});
 const query=useQuery({queryKey:['categoryAttributes',id],queryFn:()=>categoriesApi.attributes(id)});
 const all=useQuery({queryKey:['attributes'],queryFn:attributesApi.list});
 const done=()=>{void qc.invalidateQueries({queryKey:['categoryAttributes',id]});setNotice('Kategori özellikleri güncellendi.');};
 const assign=useMutation({mutationFn:(r:CategoryAttributeRequest)=>categoriesApi.assign(id,r),onSuccess:done});
 const remove=useMutation({mutationFn:(aid:number)=>categoriesApi.unassign(id,aid),onSuccess:done});
 const available=all.data?.filter(a=>!query.data?.some(ca=>ca.attribute.id===a.id))??[];
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget);assign.mutate({attributeDefinitionId:Number(d.get('attributeDefinitionId')),isRequired:d.has('isRequired'),isFilterable:d.has('isFilterable'),isComparable:d.has('isComparable'),displayOrder:Number(d.get('displayOrder'))});}
 if(query.isPending||category.isPending||all.isPending)return <Loading/>;
 return <><Link className="back-link" to="/admin/categories">← Kategoriler</Link><PageTitle title={(category.data?.name??'Kategori')+' özellikleri'} description="Ürün formunda hangi alanların gösterileceğini belirleyin."/><ErrorNotice error={query.error||category.error||all.error||assign.error||remove.error}/>{notice&&<div className="notice success" role="status">{notice}</div>}
 <section className="panel table-wrap"><table><thead><tr><th>Özellik</th><th>Veri tipi</th><th>Birim</th><th>Zorunlu</th><th>Filtrelenebilir</th><th>Karşılaştırılabilir</th><th>Sıra</th><th>Kaldır</th></tr></thead><tbody>{query.data?.map(ca=><tr key={ca.attribute.id}><td><strong>{ca.attribute.name}</strong></td><td>{ca.attribute.dataType}</td><td>{ca.attribute.unit??'—'}</td><td>{ca.isRequired?'Evet':'Hayır'}</td><td>{ca.isFilterable?'Evet':'Hayır'}</td><td>{ca.isComparable?'Evet':'Hayır'}</td><td>{ca.displayOrder}</td><td><DeleteButton pending={remove.isPending} onDelete={()=>remove.mutate(ca.attribute.id)}/></td></tr>)}</tbody></table>{!query.data?.length&&<Empty>Bu kategoriye henüz özellik atanmamış.</Empty>}</section>
 <section className="panel"><h2>Özellik bağla</h2>{available.length?<form onSubmit={submit} className="form-grid"><Field label="Özellik"><select name="attributeDefinitionId" required><option value="">Özellik seçin</option>{available.map(a=><option key={a.id} value={a.id}>{a.name} ({a.dataType})</option>)}</select></Field><Field label="Görüntüleme sırası"><input name="displayOrder" type="number" step="1" required defaultValue={0}/></Field><div className="check-row"><Check name="isRequired" label="Zorunlu"/><Check name="isFilterable" label="Filtrelenebilir" value/><Check name="isComparable" label="Karşılaştırılabilir" value/></div><div className="form-actions"><button className="primary" disabled={assign.isPending}>Özelliği bağla</button></div></form>:<Empty>Bağlanabilecek yeni özellik yok. <Link to="/admin/attributes">Özellik oluşturun.</Link></Empty>}</section></>;
}

