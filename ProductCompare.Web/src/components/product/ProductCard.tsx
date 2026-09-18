import Link from 'next/link';
import type { Product } from '@/types/catalog';
import { ProductImage } from '../common/ProductImage';
import { CompareButton } from './CompareButton';
import { attributeValue, money } from '@/utils/format';
export function ProductCard({product:p}:{product:Product}){return <article className="product-card"><Link className="card-main" href={'/urun/'+p.slug}><div className="card-image"><span className="category-label">{p.category.name}</span><ProductImage src={p.mainImageUrl} name={p.name}/></div><div className="card-body"><span className="brand">{p.brand.name}</span><h3>{p.name}</h3><div className="key-specs">{p.attributes.slice(0,4).map(a=><span key={a.attributeId}>{a.name} <b>{attributeValue(a)}</b></span>)}</div><div className="card-price"><small>Güncel fiyat</small><strong>{money(p.currentPrice,p.currency)}</strong><span>Ürünü incele ↗</span></div></div></Link><CompareButton/></article>;}

