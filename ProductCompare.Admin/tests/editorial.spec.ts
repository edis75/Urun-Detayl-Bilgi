import { test, expect } from '@playwright/test';

test('editorial create/edit UI keeps structured points separate from visual content', async ({page})=>{
 let saved: Record<string,unknown>|undefined;
 const product={id:42,name:'Editorial test',slug:'editorial-test',category:{id:1,name:'Phone',slug:'phone'},brand:{id:1,name:'Brand',slug:'brand'},isActive:true,attributes:[],summaryAttributes:[],contentHtml:'<h2>Saved heading</h2><p>Saved paragraph</p>',pros:['OLED'],cons:['Price']};
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(!path.startsWith('/api/')){await route.continue();return;}
  let data:unknown=[];
  if(path==='/api/auth/me')data={id:1,email:'editor@example.test',role:'Editor'};
  else if(path==='/api/auth/csrf')data={token:'test-csrf'};
  else if(path==='/api/categories')data=[{id:1,name:'Phone',pathName:'Phone',isSelectable:true,isActive:true}];
  else if(path==='/api/brands')data=[{id:1,name:'Brand',isActive:true}];
  else if(path==='/api/products/42'){
   if(route.request().method()==='PUT')saved=route.request().postDataJSON();
   data={...product,...saved};
  }
  await route.fulfill({json:data});
 });
 await page.goto('http://localhost:5173/admin/products/42/edit');
 const editor=page.getByRole('textbox',{name:'Ürün İçeriği',exact:true});
 await expect(editor.locator('h2')).toHaveText('Saved heading');
 await expect(page.getByRole('textbox',{name:'Artı 1',exact:true})).toHaveValue('OLED');
 await expect(page.getByRole('textbox',{name:'Eksi 1',exact:true})).toHaveValue('Price');
 await editor.fill('New heading');
 await page.getByLabel('Paragraf biçimi').selectOption('2');
 await expect(editor.locator('h2')).toHaveText('New heading');
 await page.getByRole('button',{name:'Yeni Artı Ekle',exact:true}).click();
 await page.getByRole('textbox',{name:'Artı 2',exact:true}).fill('Battery');
 await page.getByRole('button',{name:'Eksi 1 sil',exact:true}).click();
 await page.getByRole('button',{name:'Değişiklikleri kaydet',exact:true}).click();
 await expect(page.getByRole('status')).toBeVisible();
 expect(saved?.contentHtml).toContain('<h2>New heading</h2>');
 expect(saved?.pros).toEqual(['OLED','Battery']);
 expect(saved?.cons).toEqual([]);
 await page.goto('http://localhost:5173/admin/products/42/edit');
 await expect(editor.locator('h2')).toHaveText('New heading');
 await expect(page.getByRole('textbox',{name:'Artı 2',exact:true})).toHaveValue('Battery');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.goto('http://localhost:5173/admin/products/new');
 await expect(editor).toBeVisible();
 await expect(editor).toHaveText('');
});
