import { test, expect } from './auth-fixture';
test('Admin → API → public: dynamic attributes and product edits', async ({page,request})=>{
 test.setTimeout(120000);
 const api='http://localhost:5080';
 const categories=await (await request.get(api+'/api/categories')).json() as {id:number;name:string;slug:string}[];
 const phone=categories.find(c=>c.slug==='telefon')!;
 const tag=Date.now().toString();
 let productId:number|undefined;let attributeId:number|undefined;
 try {
  await page.goto('http://localhost:5173/admin');
  await expect(page.getByRole('heading',{name:'Kataloğunuza genel bakış'})).toBeVisible();
  await page.screenshot({path:'../artifacts/admin-dashboard.png',fullPage:true,caret:'initial'});
  await page.getByRole('link',{name:'Kategoriler',exact:true}).click();
  await page.locator('a[href="/admin/categories/'+phone.id+'/attributes"]').click();
  await expect(page.getByRole('heading',{name:'Telefon özellikleri'})).toBeVisible();
  await expect(page.getByRole('cell',{name:'RAM',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Özellikler',exact:true}).click();
  await page.getByRole('button',{name:'+ Yeni özellik'}).click();
  await page.getByLabel('Özellik adı',{exact:true}).fill('NFC');
  await page.getByLabel('Kod',{exact:true}).fill('nfc_test_'+tag);
  await page.getByLabel('Veri tipi',{exact:true}).selectOption('Boolean');
  await page.getByRole('button',{name:'Kaydet',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Özellik kaydedildi');
  const attrs=await (await request.get(api+'/api/attributes')).json() as {id:number;code:string}[];
  attributeId=attrs.find(a=>a.code==='nfc_test_'+tag)!.id;
  await page.goto('http://localhost:5173/admin/categories/'+phone.id+'/attributes');
  await page.getByLabel('Özellik',{exact:true}).selectOption(String(attributeId));
  await page.getByLabel('Görüntüleme sırası',{exact:true}).fill('20');
  await page.getByRole('button',{name:'Özelliği bağla'}).click();
  await expect(page.getByRole('cell',{name:'NFC',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Ürünler',exact:true}).click();
  await page.getByRole('link',{name:'+ Yeni ürün',exact:true}).click();
  await page.getByLabel('Kategori *',{exact:true}).selectOption(String(phone.id));
  await expect(page.getByLabel('RAM *',{exact:true})).toBeVisible();
  await expect(page.getByLabel('NFC',{exact:true})).toBeVisible();
  await page.getByLabel('Marka *',{exact:true}).selectOption({label:'Apple'});
  await page.getByLabel('Ürün adı *',{exact:true}).fill('Apple iPhone UI Test '+tag);
  await page.getByLabel('Kısa açıklama',{exact:true}).fill('Tarayıcı ile oluşturulan test ürünü.');
  await page.getByLabel('Açıklama',{exact:true}).fill('Dinamik teknik özelliklerin uçtan uca doğrulaması.');
  await page.getByLabel('RAM *',{exact:true}).fill('8');
  await page.getByLabel('Depolama *',{exact:true}).fill('256');
  await page.getByLabel('İşlemci *',{exact:true}).fill('Test işlemci');
  await page.getByLabel('NFC',{exact:true}).check();
  await page.getByLabel('5G',{exact:true}).check();
  await page.getByLabel('5G',{exact:true}).uncheck();
  await page.screenshot({path:'../artifacts/admin-product-form.png',fullPage:true});
  await page.getByRole('button',{name:'Ürünü oluştur',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Ürün başarıyla kaydedildi.');
  productId=Number(page.url().split('/').pop());
  await page.getByRole('link',{name:'Ürünü düzenle',exact:true}).click();
  await expect(page.getByLabel('RAM *',{exact:true})).toHaveValue('8');
  await expect(page.getByLabel('NFC',{exact:true})).toBeChecked();
  await expect(page.getByLabel('5G',{exact:true})).not.toBeChecked();
  await page.getByLabel('RAM *',{exact:true}).fill('12');
  await page.getByRole('button',{name:'Değişiklikleri kaydet'}).click();
  await expect(page.getByRole('status')).toContainText('Ürün başarıyla kaydedildi.');
  const product=await (await request.get(api+'/api/products/'+productId)).json() as {slug:string;attributes:{code:string;value:unknown}[]};
  expect(product.attributes.find(a=>a.code==='ram')?.value).toBe(12);
  expect(product.attributes.find(a=>a.code==='has_5g')?.value).toBe(false);
  await page.getByRole('link',{name:'Ürünler',exact:true}).click();
  await expect(page.getByText('Apple iPhone UI Test '+tag,{exact:true})).toBeVisible();
  expect((await request.post(api+'/api/admin/search/reindex')).ok()).toBe(true);
  await page.goto('http://localhost:3000');
  await expect(page.getByRole('heading',{name:'Detayları keşfet. Doğru ürünü seç.'})).toBeVisible();
  await page.screenshot({path:'../artifacts/public-home.png',fullPage:true});
  await page.goto('http://localhost:3000/kategori/telefon');
  await expect(page.getByRole('heading',{name:'Telefon',exact:true})).toBeVisible();
  await page.getByRole('heading',{name:'Apple iPhone UI Test '+tag,exact:true}).click();
  await expect(page).toHaveURL('http://localhost:3000/urun/'+product.slug);
  await expect(page.locator('dl').getByText('NFC',{exact:true})).toBeVisible();
  await expect(page.locator('dl > div').filter({has:page.getByText('NFC',{exact:true})})).toContainText('Var');
  await expect(page.locator('dl > div').filter({has:page.getByText('5G',{exact:true})})).toContainText('Yok');
  await expect(page.locator('dl')).toContainText('12 GB');
  await expect(page.getByText('Ürün görseli bulunamadı',{exact:true})).toBeVisible();
  await expect(page).toHaveTitle(/Özellikleri ve İncelemesi/);
  await page.screenshot({path:'../artifacts/public-product.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'../artifacts/public-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.goto('http://localhost:5173/admin/products/new');
  await page.getByRole('button',{name:'Menüyü aç/kapat'}).click();
  await expect(page.getByRole('link',{name:'Kategoriler',exact:true})).toBeVisible();
  await page.screenshot({path:'../artifacts/admin-mobile.png',fullPage:true});
  // loading.tsx streams a 200 shell for browsers. Validate the rendered
  // not-found boundary + noindex; the API itself must return HTTP 404.
  await page.goto('http://localhost:3000/urun/does-not-exist-'+tag);
  await expect(page.getByRole('heading',{name:'Aradığınız sayfa burada değil.'})).toBeVisible();
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content','noindex');
  const missing=await request.get(api+'/api/products/by-slug/does-not-exist-'+tag);
  expect(missing.status()).toBe(404);
  await page.goto('http://localhost:3000/kategori/does-not-exist-'+tag);
  await expect(page.getByRole('heading',{name:'Aradığınız sayfa burada değil.'})).toBeVisible();
  await page.goto('http://localhost:3000/urun/apple-iphone-15-pro-256-gb');
  await expect(page.getByRole('heading',{name:'Apple iPhone 15 Pro 256 GB',exact:true}).first()).toBeVisible();
  await expect(page.locator('dl')).toContainText('Apple A17 Pro');
  await expect(page.locator('dl')).toContainText('8 GB');
 } finally {
  if(productId){expect((await request.delete(api+'/api/products/'+productId)).ok()).toBe(true);await request.delete('http://localhost:9200/products/_doc/'+productId+'?refresh=true');}
  if(attributeId){
   await request.delete(api+'/api/categories/'+phone.id+'/attributes/'+attributeId);
   expect((await request.delete(api+'/api/attributes/'+attributeId)).ok()).toBe(true);
  }
 }
});

test('Required false, zero, date, new text attribute and category changes', async ({page,request})=>{
 test.setTimeout(120000);
 const api='http://localhost:5080';
 const tag=Date.now().toString();
 const categoryIds:number[]=[];const attributeIds:number[]=[];let productId:number|undefined;
 async function create(path:string,data:unknown){const response=await request.post(api+path,{data});expect(response.ok(),await response.text()).toBe(true);return response.json();}
 try {
  const category=await create('/api/categories',{name:'Audit '+tag});categoryIds.push(category.id);
  const other=await create('/api/categories',{name:'Audit Empty '+tag});categoryIds.push(other.id);
  const definitions=[['Suya Dayanıklılık','Text'],['Test tarihi','Date'],['Test desteği','Boolean'],['Test sayısı','Number']];
  for(const [index,[name,dataType]] of definitions.entries()){
   const attr=await create('/api/attributes',{name,code:'audit_'+tag+'_'+index,dataType});attributeIds.push(attr.id);
   await create('/api/categories/'+category.id+'/attributes',{attributeDefinitionId:attr.id,isRequired:true,displayOrder:index});
  }
  const brands=await (await request.get(api+'/api/brands')).json();
  await page.goto('http://localhost:5173/admin/products/new');
  await page.getByLabel('Kategori *',{exact:true}).selectOption(String(category.id));
  await page.getByLabel('Marka *',{exact:true}).selectOption(String(brands[0].id));
  await page.getByLabel('Ürün adı *',{exact:true}).fill('Audit Product '+tag);
  await page.getByLabel('Suya Dayanıklılık *',{exact:true}).fill('   ');
  expect(await page.getByLabel('Suya Dayanıklılık *',{exact:true}).evaluate((el:HTMLInputElement)=>el.validity.patternMismatch)).toBe(true);
  await page.getByLabel('Suya Dayanıklılık *',{exact:true}).fill('IP68');
  await page.getByLabel('Test tarihi *',{exact:true}).fill('2026-09-16');
  await page.getByLabel('Test sayısı *',{exact:true}).fill('0');
  expect(await page.getByLabel('Test desteği *',{exact:true}).evaluate((el:HTMLInputElement)=>el.validity.customError)).toBe(true);
  await page.getByLabel('Test desteği *',{exact:true}).check();
  await page.getByLabel('Test desteği *',{exact:true}).uncheck();
  expect(await page.getByLabel('Test desteği *',{exact:true}).evaluate((el:HTMLInputElement)=>el.checkValidity())).toBe(true);
  const sent=page.waitForRequest(r=>r.url()===api+'/api/products'&&r.method()==='POST');
  await page.getByRole('button',{name:'Ürünü oluştur',exact:true}).click();
  const payload=(await sent).postDataJSON();
  expect(payload.attributes).toEqual([
   {attributeDefinitionId:attributeIds[0],textValue:'IP68'},
   {attributeDefinitionId:attributeIds[1],dateValue:'2026-09-16T00:00:00.000Z'},
   {attributeDefinitionId:attributeIds[2],booleanValue:false},
   {attributeDefinitionId:attributeIds[3],numericValue:0},
  ]);
  await expect(page.getByRole('status')).toContainText('Ürün başarıyla kaydedildi.');
  productId=Number(page.url().split('/').pop());
  const product=await (await request.get(api+'/api/products/'+productId)).json();
  await page.getByRole('link',{name:'Ürünü düzenle',exact:true}).click();
  await expect(page.getByLabel('Suya Dayanıklılık *',{exact:true})).toHaveValue('IP68');
  await expect(page.getByLabel('Test tarihi *',{exact:true})).toHaveValue('2026-09-16');
  await expect(page.getByLabel('Test sayısı *',{exact:true})).toHaveValue('0');
  await expect(page.getByLabel('Test desteği *',{exact:true})).not.toBeChecked();
  await page.goto('http://localhost:3000/urun/'+product.slug);
  await expect(page.locator('dl')).toContainText('Suya Dayanıklılık');
  await expect(page.locator('dl')).toContainText('IP68');
  await expect(page.locator('dl')).toContainText('16.09.2026');
  await expect(page.locator('dl')).toContainText('Yok');
  await page.goto('http://localhost:5173/admin/products/'+productId+'/edit');
  await page.getByLabel('Kategori *',{exact:true}).selectOption(String(other.id));
  await expect(page.getByText('Bu kategori için teknik özellik tanımlanmamış.')).toBeVisible();
  await expect(page.getByLabel('Suya Dayanıklılık *',{exact:true})).toHaveCount(0);
  await page.getByLabel('Kategori *',{exact:true}).selectOption(String(category.id));
  await expect(page.getByLabel('Suya Dayanıklılık *',{exact:true})).toHaveValue('');
  await page.getByLabel('Kategori *',{exact:true}).selectOption(String(other.id));
  await page.getByRole('button',{name:'Değişiklikleri kaydet'}).click();
  await expect(page.getByRole('status')).toContainText('Ürün başarıyla kaydedildi.');
  const changed=await (await request.get(api+'/api/products/'+productId)).json();
  expect(changed.category.id).toBe(other.id);expect(changed.attributes).toEqual([]);
 } finally {
  if(productId)expect((await request.delete(api+'/api/products/'+productId)).ok()).toBe(true);
  for(const attributeId of attributeIds){
   if(categoryIds[0])await request.delete(api+'/api/categories/'+categoryIds[0]+'/attributes/'+attributeId);
   expect((await request.delete(api+'/api/attributes/'+attributeId)).ok()).toBe(true);
  }
  for(const id of categoryIds)expect((await request.delete(api+'/api/categories/'+id)).ok()).toBe(true);
 }
});
