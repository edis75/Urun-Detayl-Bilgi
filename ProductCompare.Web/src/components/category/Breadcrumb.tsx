import Link from 'next/link';
import type { Category } from '@/types/catalog';
export function Breadcrumb({categories,category,productName}:{categories:Category[];category:Category;productName?:string}){
 const chain:Category[]=[];let current:Category|undefined=category;const seen=new Set<number>();
 while(current&&!seen.has(current.id)){seen.add(current.id);chain.unshift(current);current=categories.find(c=>c.id===current?.parentCategoryId);}
 return <nav className="breadcrumb" aria-label="İçerik yolu"><Link href="/">Ana Sayfa</Link>{chain.map(c=><span key={c.id}> / <Link href={'/kategori/'+c.slug}>{c.name}</Link></span>)}{productName&&<span> / {productName}</span>}</nav>;
}
