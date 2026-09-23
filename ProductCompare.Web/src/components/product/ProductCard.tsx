import Link from 'next/link';
import type { Product } from '@/types/catalog';
import { ProductImage } from '../common/ProductImage';
import { CompareButton } from './CompareButton';
import { attributeValue } from '@/utils/format';
export function ProductCard({product:p}:{product:Product}){return <article className="product-card"><Link className="card-main" href={'/urun/'+p.slug}><div className="card-image"><span className="category-label">{p.category.name}</span><ProductImage src={p.mainImageUrl} name={p.name}/></div><div className="card-body"><span className="brand">{p.brand.name}</span><h3>{p.name}</h3><div className="key-specs">{p.summaryAttributes.map(a=><span key={a.attributeId}>{a.name} <b>{attributeValue(a)}</b></span>)}</div><div className="card-link">Ürünü incele ↗</div></div></Link><CompareButton productId={p.id}/></article>;}

