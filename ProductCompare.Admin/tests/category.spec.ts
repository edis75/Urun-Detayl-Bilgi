import { test, expect } from '@playwright/test';
const web=process.env.SEARCH_WEB_URL??'http://localhost:3000';
const api=process.env.API_URL??'http://localhost:5080';

test('category navigation, subtree counts, URL filters, search facets and mobile layout',async({page,request})=>{
 test.setTimeout(90000);
 const errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const categories=await (await request.get(api+'/api/categories')).json();
 const phone=categories.find((c:{slug:string})=>c.slug==='telefon');
 const root=categories.find((c:{id:number})=>c.id===phone.parentCategoryId);
 const data=await (await request.get(api+'/api/search?categoryId='+phone.id+'&isActive=true')).json();
 await page.goto(web+'/kategori/'+root.slug);
 await expect(page.locator('h1')).toHaveText(root.name);
 const menu=page.locator('.category-navigation details').filter({hasText:root.name});
 await menu.locator('summary').hover();
 await expect(menu).toHaveJSProperty('open',true);
 await menu.locator('.category-dropdown').getByRole('link',{name:phone.name,exact:true}).hover();
 await page.waitForTimeout(250); // Longer than the close delay: moving into the submenu must keep it open.
 await expect(menu).toHaveJSProperty('open',true);
 await page.locator('h1').hover();
 await expect(menu).toHaveJSProperty('open',false);
 await menu.locator('summary a').click();
 await expect(page).toHaveURL(new RegExp('/kategori/'+root.slug));
 await expect(page.locator('.filter-sidebar .filter-section:has(input[name^="filters["])')).toHaveCount(0);
 await page.locator('.child-categories').getByRole('link',{name:phone.name,exact:true}).click();
 await expect(page).toHaveURL(new RegExp('/kategori/'+phone.slug));
 await expect(page.locator('.product-card')).toHaveCount(data.products.length);
 await expect(page.locator('.breadcrumb')).toContainText(root.name);
 await expect(page.locator('.filter-sidebar .filter-section:has(input[name^="filters["])')).toHaveCount(data.facets.attributes.length);
 const ram=page.locator('input[name="filters[ram]"][value="8"]');
 const ramSection=page.locator('.filter-section').filter({has:ram});
 await ramSection.locator('summary').click();
 await expect(ram).toBeHidden();
 await ramSection.locator('summary').click();
 await expect(ram).toBeVisible();
 expect(await page.locator('.filter-sidebar').innerText()).not.toMatch(/\(\d+\)/);
 for(const attribute of data.facets.attributes){
  const options=page.locator('input[name="filters['+attribute.code+']"]');
  expect(await options.evaluateAll(nodes=>nodes.map(n=>(n as HTMLInputElement).value))).toEqual(['',...attribute.values.map((v:{value:unknown})=>String(v.value))]);
 }
 await expect(page.locator('.product-card').first().locator('.key-specs>span')).toHaveCount(data.products[0].summaryAttributes.length);
 await ram.check();
 await page.getByRole('button',{name:'Uygula',exact:true}).click();
 await expect(page).toHaveURL(/filters%5Bram%5D=8/);
 await expect(page.locator('.product-card')).toHaveCount(1);
 await page.reload();
 await expect(ram).toBeChecked();
 await expect(page.locator('.product-card')).toHaveCount(1);
 await page.screenshot({path:'../artifacts/category-desktop.png',fullPage:true,caret:'initial'});
 await page.goto(web+'/kategori/'+phone.slug+'?filters%5Bram%5D=999');
 await expect(page.locator('input[name="filters[ram]"][value="999"]')).toBeChecked();
 await expect(page.locator('.product-card')).toHaveCount(0);
 await page.reload();
 await expect(ram).toHaveValue('999');
 await page.goto(web+'/arama?q=apple');
 await page.getByRole('navigation',{name:'Kategori filtreleri'}).getByRole('link',{name:phone.name,exact:true}).click();
 await expect(page).toHaveURL(new RegExp('q=apple&categoryId='+phone.id));
 await expect(page.locator('.product-card')).toHaveCount(2);
 await page.goto(web+'/arama?q=telefon');
 await expect(page.getByRole('link',{name:'Telefon kategorisini keşfet →'})).toBeVisible();
 await ram.check();
 await page.getByRole('button',{name:'Uygula',exact:true}).click();
 await expect(page).toHaveURL(new RegExp('categoryId='+phone.id));
 await expect(page.locator('.product-card')).toHaveCount(1);
 await page.setViewportSize({width:390,height:844});
 await page.goto(web+'/kategori/'+root.slug);
 await page.locator('.category-navigation summary').filter({hasText:root.name}).click();
 await page.locator('.category-dropdown').getByRole('link',{name:phone.name,exact:true}).click();
 await expect(page.locator('h1')).toHaveText(phone.name);
 await expect(page.locator('.category-navigation details[open]')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'../artifacts/category-mobile.png',fullPage:true,caret:'initial'});
 expect(errors).toEqual([]);
});

test('admin exposes slug and backend hierarchy labels; parent product options are disabled',async({page,request})=>{
 const admin=process.env.ADMIN_URL??'http://localhost:5173';
 const categories=await (await request.get(api+'/api/categories')).json();
 const leaf=categories.find((c:{slug:string})=>c.slug==='telefon');
 const root=categories.find((c:{id:number})=>c.id===leaf.parentCategoryId);
 await page.goto(admin+'/admin/categories');
 await page.getByRole('button',{name:'+ Yeni kategori'}).click();
 await expect(page.locator('input[name="slug"]')).toBeVisible();
 await expect(page.locator('select[name="parentCategoryId"] option[value="'+leaf.id+'"]')).toHaveText(leaf.pathName);
 await page.goto(admin+'/admin/products/new');
 await expect(page.locator('select').first().locator('option[value="'+root.id+'"]')).toHaveJSProperty('disabled',true);
 await expect(page.locator('select').first().locator('option[value="'+leaf.id+'"]')).toHaveText(leaf.pathName);
 await expect(page.locator('input[name="currentPrice"],input[name="currency"]')).toHaveCount(0);
});

test('price-free API, index and comparison contracts preserve metadata counts',async({page,request})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 function noPricing(value:unknown){
  if(!value||typeof value!=='object')return;
  for(const [key,child] of Object.entries(value)){expect(['currentPrice','currency','minPrice','maxPrice']).not.toContain(key);noPricing(child);}
 }
 const products=await (await request.get(api+'/api/products')).json();noPricing(products);
 const search=await (await request.get(api+'/api/search?q=iphone&categoryId=2')).json();noPricing(search);
 expect(search.facets.attributes.find((a:{code:string})=>a.code==='screen_size').values[0].count).toBe(2);
 noPricing(await (await request.get(api+'/api/search/suggestions?q=iph')).json());
 const comparison=await (await request.get(api+'/api/compare?productIds=1,2')).json();noPricing(comparison);
 expect(comparison.products).toHaveLength(2);expect(comparison.attributes.length).toBeGreaterThan(0);
 for(const product of products.items){
  const rules=await (await request.get(api+'/api/categories/'+product.category.id+'/attributes')).json();
  const comparable=product.attributes.filter((a:{attributeId:number})=>rules.some((r:{attribute:{id:number};isComparable:boolean})=>r.attribute.id===a.attributeId&&r.isComparable));
  expect(product.summaryAttributes).toEqual((comparable.length?comparable:product.attributes).slice(0,4));
 }
 const mapping=await (await request.get('http://localhost:9200/products/_mapping')).json();
 for(const value of Object.values(mapping))expect((value as {mappings:{properties:Record<string,unknown>}}).mappings.properties).not.toHaveProperty('currentPrice');
 await page.goto(web+'/compare?products=1,2');
 await expect(page.locator('.compare-product')).toHaveCount(2);
 await expect(page.locator('.compare-table tbody tr')).toHaveCount(comparison.attributes.length);
 expect(await page.locator('.compare-table').innerText()).not.toContain('₺');
 await page.goto(web+'/urun/'+products.items[0].slug);
 await expect(page.locator('h1')).toHaveText(products.items[0].name);
 await expect(page.locator('.detail-price')).toHaveCount(0);
 expect(errors).toEqual([]);
});
