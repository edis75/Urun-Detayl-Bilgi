import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api/productsApi';
import { PageTitle, Loading, ErrorNotice, ProductImage, Status } from '../../components/common/Ui';
import { attributeValue } from '../../utils/format';
export function ProductDetail(){
 const id=Number(useParams().id);const location=useLocation();const q=useQuery({queryKey:['products',id],queryFn:()=>productsApi.get(id)});
 if(q.isPending)return <Loading/>;if(q.error)return <ErrorNotice error={q.error}/>;const p=q.data!;
 return <><Link className="back-link" to="/admin/products">← Ürünler</Link><PageTitle title={p.name} description={p.brand.name+' / '+p.category.name} action={<Link className="button primary" to={'/admin/products/'+id+'/edit'}>Ürünü düzenle</Link>}/>{location.state?.saved&&<div role="status" className="notice success">Ürün başarıyla kaydedildi.</div>}<section className="panel product-summary"><ProductImage src={p.mainImageUrl} name={p.name}/><div><Status active={p.isActive}/><p>{p.shortDescription}</p><small>Model: {p.modelCode??'—'}</small><small>Slug: {p.slug}</small></div></section><section className="panel"><h2>Teknik özellikler</h2><dl className="spec-table">{p.attributes.map(a=><div key={a.attributeId}><dt>{a.name}</dt><dd>{attributeValue(a)}</dd></div>)}</dl>{!p.attributes.length&&<p>Teknik özellik belirtilmedi.</p>}</section>{p.description&&<section className="panel"><h2>Açıklama</h2><p className="preserve">{p.description}</p></section>}</>;
}

