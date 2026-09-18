import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCategory, getCategories, getProducts, getBrands } from '@/lib/api/catalog';
import { ProductCard } from '@/components/product/ProductCard';
import { Breadcrumb } from '@/components/category/Breadcrumb';
type Props={params:Promise<{slug:string}>;searchParams:Promise<{page?:string;brandId?:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{const c=await getCategory((await params).slug);return {title:c?c.name+' Modelleri ve Özellikleri':'Kategori bulunamadı',description:c?c.name+' ürünlerini, teknik özelliklerini ve güncel fiyatlarını keşfedin.':undefined};}
export default async function CategoryPage({params,searchParams}:Props){
 const c=await getCategory((await params).slug);if(!c)notFound();
 const query=await searchParams;
 const rawPage=Number(query.page??1);const page=Number.isSafeInteger(rawPage)&&rawPage>0&&rawPage<=1000000?rawPage:1;
 const rawBrand=Number(query.brandId);const brandId=Number.isSafeInteger(rawBrand)&&rawBrand>0?rawBrand:undefined;
 const [categories,brands,products]=await Promise.all([getCategories(),getBrands(),getProducts({categoryId:c.id,brandId,page,pageSize:12})]);
 const pageHref=(p:number)=>'?'+new URLSearchParams({page:String(p),...(brandId?{brandId:String(brandId)}:{})});
 const children=categories.filter(x=>x.parentCategoryId===c.id&&x.isActive);
 return <div className="container category-page"><Breadcrumb category={c} categories={categories}/><div className="section-heading category-heading"><div><p className="eyebrow">ÜRÜN KATALOĞU</p><h1>{c.name}</h1><p>Detayları incele, sana uygun ürünü keşfet.</p></div><span className="count-pill">{products.totalCount} ürün</span></div>
 {children.length>0&&<div className="child-categories">{children.map(child=><Link key={child.id} className="button" href={'/kategori/'+child.slug}>{child.name} →</Link>)}</div>}
 <div className="catalog-toolbar"><form><label htmlFor="brand">Marka</label><select name="brandId" id="brand" defaultValue={brandId??''}><option value="">Tüm markalar</option>{brands.filter(b=>b.isActive||b.id===brandId).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><button className="button" type="submit">Uygula</button>{brandId&&<Link href={'/kategori/'+c.slug}>Temizle</Link>}</form><span>Teknik özellikleriyle birlikte keşfedin</span></div>
 <div className="product-grid">{products.items.map(p=><ProductCard key={p.id} product={p}/>)}</div>{!products.items.length&&<div className="empty">{brandId?'Seçilen markaya ait ürün bulunmuyor.':'Bu kategoride henüz ürün bulunmuyor.'}{page>1&&<Link href={pageHref(1)}>İlk sayfaya dön</Link>}</div>}
 <nav className="pagination" aria-label="Sayfalama">{page>1?<Link className="button" href={pageHref(page-1)}>← Önceki</Link>:<span/>}<span>Sayfa {page} / {Math.max(1,products.totalPages)}</span>{page<products.totalPages?<Link className="button" href={pageHref(page+1)}>Sonraki →</Link>:<span/>}</nav>
 </div>;
}

