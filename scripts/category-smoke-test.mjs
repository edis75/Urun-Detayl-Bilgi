// Integration fixtures are removed in finally; existing catalog records are never edited.
import assert from 'node:assert/strict';
const base=process.env.API_URL??'http://localhost:5080';
const elastic=process.env.ELASTICSEARCH_URL??'http://localhost:9200';
const tag='qa'+Date.now();
const cleanup=[]; const indexed=[];
async function api(path,method='GET',body,status){
 const response=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(status){assert.equal(response.status,status,await response.text());return;}
 if(!response.ok)throw Error(method+' '+path+' '+response.status+' '+await response.text());
 return response.status===204?null:response.json();
}
async function create(path,body){const result=await api(path,'POST',body);cleanup.push(()=>api(path+'/'+result.id,'DELETE'));return result;}
const search=(params)=>api('search?'+new URLSearchParams({isActive:'true',...params}));
const pass=name=>console.log('PASS: '+name);
try{
 const root=await create('categories',{name:tag+' Elektronik',slug:tag+'-elektronik',displayOrder:2});
 const branch=await create('categories',{name:tag+' Telefon & Aksesuar',parentCategoryId:root.id,displayOrder:2});
 const phone=await create('categories',{name:tag+' Akıllı Telefon',parentCategoryId:branch.id});
 const fridge=await create('categories',{name:tag+' Buzdolabı',parentCategoryId:root.id,displayOrder:1});
 const hidden=await create('categories',{name:tag+' Pasif',parentCategoryId:root.id,isActive:false});
 const hiddenChild=await create('categories',{name:tag+' Gizli Alt',parentCategoryId:hidden.id});
 const tree=(await api('categories/tree')).find(c=>c.id===root.id);
 assert.deepEqual(tree.children.map(c=>c.id),[fridge.id,branch.id]);
 assert.equal(tree.children[1].children[0].id,phone.id);
 const detail=await api('categories/by-slug/'+phone.slug);
 assert.deepEqual(detail.breadcrumb.map(c=>c.id),[root.id,branch.id,phone.id]);
 await api('categories/by-slug/'+hiddenChild.slug,'GET',undefined,404);
 const list=await api('categories');
 assert.equal(list.find(c=>c.id===phone.id).isSelectable,true);
 assert.equal(list.find(c=>c.id===branch.id).isSelectable,false);
 assert.equal(list.find(c=>c.id===hiddenChild.id).isSelectable,false);
 pass('three-level tree, ordering, breadcrumb, inactive ancestry and admin leaf metadata');
 await api('categories/'+root.id,'PUT',{...root,parentCategoryId:phone.id},400);
 await api('categories/'+root.id,'PUT',{...root,parentCategoryId:root.id},400);
 await api('categories','POST',{name:tag+' Duplicate',slug:root.slug},400);
 pass('cycle, self-parent and duplicate slug rejected');
 const brand=await create('brands',{name:tag+' Samsung'});
 const attrs=[];
 for(const [code,dataType,unit] of [['ram','Number','GB'],['storage','Number','GB'],['has_5g','Boolean',null],['capacity','Number','L'],['energy','Text',null],['no_frost','Boolean',null],['private','Text',null]])
  attrs.push(await create('attributes',{name:code,code:tag+'_'+code,dataType,unit}));
 for(const [category,indices] of [[phone,[0,1,2,6]],[fridge,[3,4,5]]])for(const i of indices){
  await api('categories/'+category.id+'/attributes','POST',{attributeDefinitionId:attrs[i].id,isFilterable:i!==6});
  cleanup.push(()=>api('categories/'+category.id+'/attributes/'+attrs[i].id,'DELETE'));
 }
 const body=(category,values)=>({name:tag+' Samsung '+category.name,categoryId:category.id,brandId:brand.id,attributes:values});
 const phoneBody=body(phone,[{attributeDefinitionId:attrs[0].id,numericValue:8},{attributeDefinitionId:attrs[1].id,numericValue:256},{attributeDefinitionId:attrs[2].id,booleanValue:true},{attributeDefinitionId:attrs[6].id,textValue:'hidden'}]);
 for(const categoryId of [root.id,branch.id,hiddenChild.id])await api('products','POST',{...phoneBody,categoryId},400);
 const p=await create('products',phoneBody); indexed.push(p.id);
 const f=await create('products',body(fridge,[{attributeDefinitionId:attrs[3].id,numericValue:500},{attributeDefinitionId:attrs[4].id,textValue:'A'},{attributeDefinitionId:attrs[5].id,booleanValue:true}]));indexed.push(f.id);
 await api('products/'+p.id,'PUT',{...phoneBody,categoryId:branch.id},400);
 await api('admin/search/reindex','POST');
 pass('product create/update rejects parents and inactive categories');
 const parent=await search({categoryId:root.id});
 assert.equal(parent.total,2);assert.deepEqual(parent.items.map(p=>p.id),[f.id,p.id]);
 assert.deepEqual(parent.facets.attributes,[]);
 assert.deepEqual(parent.facets.children.map(c=>[c.id,c.count]),[[fridge.id,1],[branch.id,1]]);
 assert.equal((await search({categoryId:branch.id})).total,1);
 pass('parent subtree, immediate-child filter counts and stable ID ordering');
 const leaf=await search({categoryId:phone.id});
 assert.deepEqual(leaf.facets.attributes.map(a=>a.code),attrs.slice(0,3).map(a=>a.code));
 assert.equal(leaf.facets.attributes[0].values[0].count,1);
 assert.deepEqual((await search({categoryId:fridge.id})).facets.attributes.map(a=>a.code),attrs.slice(3,6).map(a=>a.code));
 assert.equal((await search({categoryId:phone.id,['filters['+attrs[0].code+']']:'8'})).total,1);
 assert.equal((await search({categoryId:phone.id,['filters['+attrs[0].code+']']:'12'})).total,0);
 await api('search?'+new URLSearchParams({categoryId:phone.id,['filters['+attrs[6].code+']']:'hidden'}),'GET',undefined,400);
 pass('smartphone/refrigerator metadata isolation, numeric/boolean/text facets and filterability');
 assert.equal((await search({q:'samsung',categoryId:phone.id})).items[0].id,p.id);
 assert.equal((await search({q:phone.slug})).categoryContext.id,phone.id);
 assert.equal((await search({q:'apple'})).categoryContext,null);
 const page=await search({categoryId:root.id,pageSize:1,sort:'newest'});
 assert.equal(page.total,2);assert.equal(page.items[0].id,f.id);assert.equal(page.products[0].id,f.id);
 assert.equal((await search({categoryId:root.id,pageSize:1,page:2,sort:'newest'})).items[0].id,p.id);
 pass('search plus category, exact intent, brand query, sorting and server pagination');
 const docs=await (await fetch(elastic+'/products/_search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:{term:{id:p.id}}})})).json();
 assert.deepEqual(docs.hits.hits[0]._source.categoryPathIds,[root.id,branch.id,phone.id]);
 assert.equal(docs.hits.hits[0]._source.categoryPathSlugs[2],phone.slug);
 pass('indexed PostgreSQL category paths');
}finally{
 const errors=[];
 for(const remove of cleanup.reverse())try{await remove();}catch(e){errors.push(e.message);}
 for(const id of indexed){const r=await fetch(elastic+'/products/_doc/'+id+'?refresh=true',{method:'DELETE'});if(!r.ok&&r.status!==404)errors.push('Index fixture cleanup '+id);}
 if(errors.length)throw Error('Fixture cleanup failed: '+errors.join('; '));
 console.log('Temporary fixtures removed.');
}
