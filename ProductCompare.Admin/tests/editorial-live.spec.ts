import { test, expect } from '@playwright/test';

test('real API: Admin editorial save reaches public detail and stays out of lists', async ({page,request})=>{
 test.setTimeout(120000);
 const api='http://localhost:5080/api/products';
 const sourceResponse=await request.get(api+'/by-slug/samsung-galaxy-s25-ultra-512-gb');
 expect(sourceResponse.ok()).toBeTruthy();
 const source=await sourceResponse.json();
 const body={categoryId:source.category.id,brandId:source.brand.id,name:'Editorial integration '+Date.now(),isActive:true,
  attributes:source.attributes.map((a:{attributeId:number;dataType:string;value:unknown})=>({attributeDefinitionId:a.attributeId,[{Text:'textValue',Number:'numericValue',Boolean:'booleanValue',Date:'dateValue'}[a.dataType]!]:a.value})),
  contentHtml:'',pros:[] as string[],cons:[] as string[]};
 const created=await request.post(api,{data:body});
 expect(created.status()).toBe(201);
 const product=await created.json();
 try {
  await page.goto('http://localhost:5173/admin/products/'+product.id+'/edit');
  const editor=page.getByRole('textbox',{name:'Ürün İçeriği',exact:true});
  await editor.fill('Editorial integration heading');
  await page.getByLabel('Paragraf biçimi').selectOption('2');
  await page.getByRole('button',{name:'Yeni Artı Ekle',exact:true}).click();
  await page.getByRole('textbox',{name:'Artı 1',exact:true}).fill('Integration advantage');
  await page.getByRole('button',{name:'Yeni Eksi Ekle',exact:true}).click();
  await page.getByRole('textbox',{name:'Eksi 1',exact:true}).fill('Integration drawback');
  await page.getByRole('button',{name:'Değişiklikleri kaydet',exact:true}).click();
  await expect(page.getByRole('status')).toBeVisible();
  const detail=await (await request.get(api+'/by-slug/'+product.slug)).json();
  expect(detail.contentHtml).toContain('<h2>Editorial integration heading</h2>');
  expect(detail.pros).toEqual(['Integration advantage']);expect(detail.cons).toEqual(['Integration drawback']);
  const byId=await (await request.get(api+'/'+product.id)).json();
  expect(byId.contentHtml).toBe(detail.contentHtml);
  const list=await (await request.get(api,{params:{search:body.name}})).json();
  expect(list.items).toHaveLength(1);
  for(const key of ['contentHtml','pros','cons'])expect(list.items[0]).not.toHaveProperty(key);
  await page.goto('http://localhost:3000/urun/'+product.slug);
  await expect(page.locator('.product-rich-content h2')).toHaveText('Editorial integration heading');
  await expect(page.locator('.product-points.positive')).toContainText('Integration advantage');
  await expect(page.locator('.product-points.negative')).toContainText('Integration drawback');
  await expect(page.locator('#teknik-ozellikler')).toContainText('RAM');
  const positive=await page.locator('.positive').boundingBox();const negative=await page.locator('.negative').boundingBox();
  expect(positive?.y).toBe(negative?.y);
  await page.setViewportSize({width:390,height:844});
  const mobilePositive=await page.locator('.positive').boundingBox();const mobileNegative=await page.locator('.negative').boundingBox();
  expect(mobileNegative!.y).toBeGreaterThan(mobilePositive!.y);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  const oneSide=await request.put(api+'/'+product.id,{data:{...body,contentHtml:detail.contentHtml,pros:detail.pros,cons:[]}});
  expect(oneSide.ok()).toBeTruthy();await page.reload();
  await expect(page.locator('.positive')).toBeVisible();await expect(page.locator('.negative')).toHaveCount(0);
  const cleared=await request.put(api+'/'+product.id,{data:body});expect(cleared.ok()).toBeTruthy();
  await page.reload();await expect(page.locator('.product-pros-cons')).toHaveCount(0);await expect(page.locator('#aciklama')).toHaveCount(0);
 } finally {
  const removed=await request.delete(api+'/'+product.id);expect(removed.ok()).toBeTruthy();
 }
});
