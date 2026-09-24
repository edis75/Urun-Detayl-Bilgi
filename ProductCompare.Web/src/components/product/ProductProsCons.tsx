export function ProductProsCons({pros,cons}:{pros?:string[]|null;cons?:string[]|null}){
 const positivePoints=pros??[];const negativePoints=cons??[];
 if(!positivePoints.length&&!negativePoints.length)return null;
 return <section className="product-pros-cons" aria-label="Artılar ve Eksiler">
 {([{title:'Artıları',items:positivePoints,positive:true},{title:'Eksileri',items:negativePoints,positive:false}]).filter(group=>group.items.length).map(group=><div key={group.title} className={group.positive?'product-points positive':'product-points negative'}><h2>{group.title}</h2><ul>{group.items.map((item,index)=><li key={index}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={group.positive?'M5 12l4 4L19 6':'M6 6l12 12M18 6L6 18'}/></svg><span>{item}</span></li>)}</ul></div>)}
 </section>;
}
