import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../../api/categoriesApi';
import { brandsApi } from '../../api/brandsApi';
import { productsApi } from '../../api/productsApi';
import type { Product, ProductRequest } from '../../types/catalog';
import { PageTitle, Loading, ErrorNotice, Empty } from '../../components/common/Ui';
import { Field, Check } from '../../components/forms/Fields';
import { text, nullable } from '../../utils/forms';
import { DynamicAttributes } from '../../components/products/DynamicAttributes';
import { serializeAttributes, type AttributeInputs } from '../../utils/attributes';
export function ProductEditor(){
 const id=Number(useParams().id);
 const query=useQuery({queryKey:['products',id],queryFn:()=>productsApi.get(id),enabled:!!id});
 if(id&&query.isPending)return <Loading/>;
 if(id&&query.error)return <ErrorNotice error={query.error}/>;
 return <ProductForm key={id||'new'} product={query.data}/>;
}
function ProductForm({product}:{product?:Product}){
 const navigate=useNavigate();const qc=useQueryClient();
 const [categoryId,setCategoryId]=useState(product?.category.id??0);
 const [values,setValues]=useState<AttributeInputs>(()=>Object.fromEntries((product?.attributes??[]).map(a=>[a.attributeId,a.value===null?'':a.dataType==='Date'?String(a.value).slice(0,10):String(a.value)])));
 const categories=useQuery({queryKey:['categories'],queryFn:categoriesApi.list});
 const brands=useQuery({queryKey:['brands'],queryFn:brandsApi.list});
 const rules=useQuery({queryKey:['categoryAttributes',categoryId],queryFn:()=>categoriesApi.attributes(categoryId),enabled:!!categoryId});
 const save=useMutation({mutationFn:(data:ProductRequest)=>productsApi.save(product?.id??null,data),onSuccess:p=>{void qc.invalidateQueries({queryKey:['products']});navigate('/admin/products/'+p.id,{state:{saved:true}});}});
 function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!rules.data||rules.isFetching)return;
  const d=new FormData(e.currentTarget);
  save.mutate({categoryId,brandId:Number(d.get('brandId')),name:text(d,'name'),modelCode:nullable(d,'modelCode'),shortDescription:nullable(d,'shortDescription'),description:nullable(d,'description'),mainImageUrl:nullable(d,'mainImageUrl'),isActive:d.has('isActive'),attributes:serializeAttributes(rules.data,values)});
 }
 if(categories.isPending||brands.isPending)return <Loading/>;
 return <><Link className="back-link" to="/admin/products">← Ürünler</Link><PageTitle title={product?'Ürünü düzenle':'Yeni ürün'} description="Temel bilgileri ekleyin, kategoriye özel teknik alanları doldurun."/><ErrorNotice error={categories.error||brands.error||save.error}/>
 <form onSubmit={submit}><section className="panel"><div className="section-title"><span className="section-number">01</span><div><h2>Temel bilgiler</h2><p>Ürünün katalogda nasıl görüneceğini belirleyin.</p></div></div><div className="form-grid">
 <Field label="Kategori *"><select value={categoryId||''} required onChange={e=>{setCategoryId(Number(e.target.value));setValues({});}}><option value="">Kategori seçin</option>{categories.data?.map(c=><option key={c.id} value={c.id} disabled={!c.isSelectable}>{c.pathName}{!c.isActive?' (Pasif)':''}</option>)}</select></Field>
 <Field label="Marka *"><select name="brandId" required defaultValue={product?.brand.id??''}><option value="">Marka seçin</option>{brands.data?.map(b=><option key={b.id} value={b.id}>{b.name}{!b.isActive?' (Pasif)':''}</option>)}</select></Field>
 <Field label="Ürün adı *"><input name="name" required maxLength={300} defaultValue={product?.name} placeholder="Örn. Apple iPhone 15 Pro 256 GB"/></Field>
 <Field label="Model kodu"><input name="modelCode" maxLength={150} defaultValue={product?.modelCode??''}/></Field>
 <Field label="Görsel URL"><input name="mainImageUrl" type="url" maxLength={2048} defaultValue={product?.mainImageUrl??''} placeholder="https://…"/></Field>
 <Check name="isActive" label="Ürün aktif" value={product?.isActive??true}/>
 <Field label="Kısa açıklama"><textarea name="shortDescription" maxLength={1000} defaultValue={product?.shortDescription??''}/></Field>
 <Field label="Açıklama"><textarea name="description" rows={4} defaultValue={product?.description??''}/></Field>
 </div></section><section className="panel"><div className="section-title"><span className="section-number">02</span><div><h2>Teknik özellikler</h2><p>Kategoriye göre otomatik oluşturulur. * işaretli alanlar zorunludur.</p></div></div>
 {!categoryId?<Empty>Teknik özellikler için önce bir kategori seçin.</Empty>:rules.isPending?<Loading/>:rules.error?<ErrorNotice error={rules.error}/>:rules.data?.length?<DynamicAttributes rules={rules.data} values={values} onChange={(id,value)=>setValues(old=>({...old,[id]:value}))}/>:<Empty>Bu kategori için teknik özellik tanımlanmamış.</Empty>}
 </section><div className="save-bar"><span>Bilgileri kaydetmeden önce kontrol edin.</span><div className="actions"><Link className="button" to="/admin/products">Vazgeç</Link><button className="primary" disabled={save.isPending||!categoryId||rules.isFetching||!!rules.error||!!categories.error||!!brands.error}>{save.isPending?'Kaydediliyor…':product?'Değişiklikleri kaydet':'Ürünü oluştur'}</button></div></div></form></>;
}
