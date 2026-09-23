import Link from 'next/link';
import { getCategoryTree } from '@/lib/api/catalog';
import type { CategoryNode } from '@/types/catalog';
import { CategoryNavigation } from './CategoryNavigation';

export async function Header(){const categories=await getCategoryTree().catch(()=>[] as CategoryNode[]);return <><div className="announcement">Doğru ürünü seçmek, detayları bilmekle başlar.</div><header className="site-header"><div className="container header-inner"><Link className="logo" href="/"><span className="logo-symbol">pc</span>Product<span>Compare</span><i/></Link><nav aria-label="Ana menü"><Link href="/">Ana Sayfa</Link><Link href="/#kategoriler">Kategoriler</Link></nav><Link className="header-search" href="/arama"><span>⌕</span> Ürün ara…</Link><Link className="header-compare" href="/compare">⇄ <span>Karşılaştırma</span></Link></div><CategoryNavigation categories={categories}/></header></>;}

