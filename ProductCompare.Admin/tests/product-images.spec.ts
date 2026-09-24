import { test, expect } from '@playwright/test';

test('create then upload; retry does not duplicate product; edit cover and delete',async({page})=>{
 let creates=0,uploads=0,updates=0;
 let images:{id:number;imageUrl:string;isPrimary:boolean;sortOrder:number}[]=[];
 let product={id:42,name:'Image test',slug:'image-test',category:{id:1,name:'Phone',slug:'phone'},brand:{id:1,name:'Brand',slug:'brand'},isActive:true,attributes:[],summaryAttributes:[],contentHtml:'',pros:[],cons:[],mainImageUrl:null as string|null};
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(!path.startsWith('/api/')){await route.continue();return;}
  const method=route.request().method();let data:unknown=[];
  if(path==='/api/categories')data=[{id:1,name:'Phone',pathName:'Phone',isSelectable:true,isActive:true}];
  else if(path==='/api/brands')data=[{id:1,name:'Brand',isActive:true}];
  else if(path==='/api/products'&&method==='POST'){creates++;data={...product,images};}
  else if(path==='/api/products/42'){
   if(method==='PUT')updates++;
   data={...product,images};
  }else if(path==='/api/products/42/images'){
   uploads++;
   expect(route.request().headers()['content-type']).toContain('multipart/form-data; boundary=');
   expect(route.request().postData()).toContain('name="PrimaryImageIndex"\r\n\r\n1');
   if(uploads===1){await route.fulfill({status:503,json:{message:'Test storage unavailable'}});return;}
   images=[{id:1,imageUrl:'https://cdn.example/one.png',isPrimary:false,sortOrder:0},{id:2,imageUrl:'https://cdn.example/two.png',isPrimary:true,sortOrder:1}];
   product={...product,mainImageUrl:images[1].imageUrl};data=images;
  }else if(path==='/api/products/42/images/1/primary'){
   images=images.map(image=>({...image,isPrimary:image.id===1}));product={...product,mainImageUrl:images[0].imageUrl};data=images;
  }else if(path==='/api/products/42/images/1'&&method==='DELETE'){
   images=images.filter(image=>image.id!==1).map(image=>({...image,isPrimary:true}));product={...product,mainImageUrl:images[0].imageUrl};data=images;
  }else if(path==='/api/products/42/images/2'&&method==='DELETE'){
   images=[];product={...product,mainImageUrl:null};data=images;
  }
  await route.fulfill({json:data});
 });
 await page.goto('http://localhost:5173/admin/products/new');
 await page.getByLabel('Kategori *',{exact:true}).selectOption('1');
 await page.getByLabel('Marka *',{exact:true}).selectOption('1');
 await page.getByLabel('Ürün adı *',{exact:true}).fill('Image test');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=','base64');
 await page.getByLabel('Dosya seç').setInputFiles([{name:'one.png',mimeType:'image/png',buffer:png},{name:'two.png',mimeType:'image/png',buffer:png}]);
 await expect(page.locator('.admin-image-card img')).toHaveCount(2);
 await page.getByRole('radio',{name:'Kapak Görseli',exact:true}).nth(1).check();
 await page.getByRole('button',{name:'Ürünü oluştur',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Test storage unavailable');
 await expect(page.getByRole('status')).toContainText('aynı ürün');
 await page.getByRole('button',{name:'Ürünü oluştur',exact:true}).click();
 await expect(page).toHaveURL(/\/admin\/products\/42$/);
 expect(creates).toBe(1);expect(updates).toBe(1);expect(uploads).toBe(2);
 await page.goto('http://localhost:5173/admin/products/42/edit');
 const covers=page.getByRole('radio',{name:'Kapak Görseli',exact:true});
 await expect(covers.nth(1)).toBeChecked();await covers.nth(0).click();await expect(covers.nth(0)).toBeChecked();
 await page.getByRole('button',{name:'Görseli sil',exact:true}).nth(0).click();await expect(covers).toHaveCount(1);await expect(covers).toBeChecked();
 await page.getByRole('button',{name:'Görseli sil',exact:true}).click();await expect(covers).toHaveCount(0);
 await expect(page.getByLabel('Görsel URL',{exact:true})).toHaveValue('');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
