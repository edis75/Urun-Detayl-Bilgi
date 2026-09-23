import type { ReactNode } from 'react';
import type { SearchFacets } from '@/types/catalog';
import type { CatalogQuery } from '@/lib/api/catalog';

function FilterSection({title,children}:{title:string;children:ReactNode}){
 return <details className="filter-section" open><summary>{title}<span aria-hidden="true">⌄</span></summary><div className="filter-options">{children}</div></details>;
}
export function FilterSidebar({facets,query,action,categoryId}:{facets:SearchFacets;query:CatalogQuery;action:string;categoryId?:number}){
 const value=(key:string)=>{const v=query[key];return Array.isArray(v)?v[0]??'':v??'';};
 return <form action={action} className="filter-sidebar">
  {value('q')&&<input type="hidden" name="q" value={value('q')}/>}
  {categoryId&&<input type="hidden" name="categoryId" value={categoryId}/>}
  <h2>Filtreler</h2>
  <FilterSection title="Marka">
   <label className="filter-option"><input type="radio" name="brandIds" value="" defaultChecked={!value('brandIds')}/><span>Tüm markalar</span></label>
   {value('brandIds')&&!facets.brands.some(b=>String(b.id)===value('brandIds'))&&<label className="filter-option"><input type="radio" name="brandIds" value={value('brandIds')} defaultChecked/><span>Seçili marka</span></label>}
   {facets.brands.map(b=><label className="filter-option" key={b.id}><input type="radio" name="brandIds" value={b.id} defaultChecked={value('brandIds')===String(b.id)}/><span>{b.name}</span></label>)}
  </FilterSection>
  {facets.attributes.map(a=>{
   const name='filters['+a.code+']';const selected=value(name);
   const options=[...new Set(a.values.map(v=>String(v.value)))];
   if(selected&&!options.includes(selected))options.unshift(selected);
   return <FilterSection key={a.code} title={a.name}>
    <label className="filter-option"><input type="radio" name={name} value="" defaultChecked={!selected}/><span>Tümü</span></label>
    {options.map(v=><label className="filter-option" key={v}><input type="radio" name={name} value={v} defaultChecked={selected===v}/><span>{a.dataType==='Boolean'?(v==='true'?'Var':'Yok'):v}{a.unit?' '+a.unit:''}</span></label>)}
   </FilterSection>;
  })}
  <label className="filter-sort">Sıralama<select name="sort" defaultValue={value('sort')||'relevance'}><option value="relevance">{value('q')?'İlgililik':'Varsayılan'}</option><option value="newest">En yeni</option></select></label>
  <button className="button primary" type="submit">Uygula</button>
  <a href={action+(value('q')?'?'+new URLSearchParams({q:value('q'),...(categoryId?{categoryId:String(categoryId)}:{})}):'')}>Filtreleri temizle</a>
 </form>;
}
