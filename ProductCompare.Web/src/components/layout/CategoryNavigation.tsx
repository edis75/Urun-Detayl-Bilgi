'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { CategoryNode } from '@/types/catalog';

function CategoryLinks({nodes}:{nodes:CategoryNode[]}){
 return <ul>{nodes.map(c=><li key={c.id}><Link href={'/kategori/'+c.slug}>{c.name}</Link>{!!c.children.length&&<CategoryLinks nodes={c.children}/>}</li>)}</ul>;
}
export function CategoryNavigation({categories}:{categories:CategoryNode[]}){
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const cancel=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;};
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const desktop=()=>window.matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)').matches;
 const close=(nav:HTMLElement)=>{cancel();nav.querySelectorAll('details').forEach(d=>{d.open=false;});};
 return <nav className="container category-navigation" aria-label="Ürün kategorileri"
  onClick={e=>{if(!e.defaultPrevented&&(e.target as HTMLElement).closest('a'))close(e.currentTarget);}}
  onKeyDown={e=>{if(e.key==='Escape'){const summary=e.currentTarget.querySelector<HTMLDetailsElement>('details[open]')?.querySelector('summary');close(e.currentTarget);summary?.focus();}}}
  onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))close(e.currentTarget);}}>
  {categories.map(c=><details key={c.id} name="category-menu"
   onPointerEnter={e=>{if(desktop()){cancel();e.currentTarget.open=true;}}}
   onPointerLeave={e=>{if(desktop()){cancel();const details=e.currentTarget;timer.current=setTimeout(()=>{details.open=false;},200);}}}>
   <summary><Link href={'/kategori/'+c.slug} onClick={e=>{if(!desktop()){e.preventDefault();const details=e.currentTarget.closest('details');if(details)details.open=!details.open;}}}>{c.name}</Link><span aria-hidden="true">⌄</span></summary>
   <div className="category-dropdown"><Link href={'/kategori/'+c.slug}>Tüm {c.name} ürünleri →</Link><CategoryLinks nodes={c.children}/></div>
  </details>)}
 </nav>;
}
