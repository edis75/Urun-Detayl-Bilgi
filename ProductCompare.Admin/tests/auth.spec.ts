import {test,expect} from '@playwright/test';

test('anonymous login, User gate and logout',async({page})=>{
 let loggedIn=false;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(!path.startsWith('/api/'))return route.continue();
  if(path==='/api/auth/csrf')return route.fulfill({json:{token:'csrf-test'}});
  if(path==='/api/auth/login'){
   expect(route.request().headers()['x-csrf-token']).toBe('csrf-test');
   expect(route.request().postDataJSON()).toEqual({email:'user@example.test',password:'test-password'});
   loggedIn=true;return route.fulfill({json:{user:{id:1,email:'user@example.test',role:'User'}}});
  }
  if(path==='/api/auth/logout'){loggedIn=false;return route.fulfill({status:204});}
  if(path==='/api/auth/me'&&loggedIn)return route.fulfill({json:{id:1,email:'user@example.test',role:'User'}});
  return route.fulfill({status:401,json:{message:'Invalid session.'}});
 });
 await page.goto('http://localhost:5173/admin/products/new');
 await page.getByLabel('E-posta').fill('user@example.test');await page.getByLabel('Şifre').fill('test-password');
 await page.getByRole('button',{name:'Giriş yap'}).click();
 await expect(page.getByText('Bu alan için Editör yetkisi gerekiyor.')).toBeVisible();
 await expect(page.getByLabel('Kategori *',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Çıkış yap'}).click();
 await expect(page.getByRole('heading',{name:'Editör girişi'})).toBeVisible();
 expect(await page.evaluate(()=>Object.keys(localStorage).concat(Object.keys(sessionStorage)))).toEqual([]);
});

test('concurrent 401 responses share one refresh and retry only once',async({page})=>{
 let refreshes=0;let recovered=false;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(!path.startsWith('/api/'))return route.continue();
  if(path==='/api/auth/me')return route.fulfill({json:{id:1,email:'editor@example.test',role:'Editor'}});
  if(path==='/api/auth/csrf')return route.fulfill({json:{token:'csrf'}});
  if(path==='/api/auth/refresh'){refreshes++;await new Promise(resolve=>setTimeout(resolve,100));recovered=true;return route.fulfill({json:{user:{id:1,email:'editor@example.test',role:'Editor'}}});}
  if(path==='/api/test-a'||path==='/api/test-b')return route.fulfill({status:recovered?200:401,json:{ok:true}});
  if(path==='/api/always-401')return route.fulfill({status:401,json:{message:'Invalid session.'}});
  return route.fulfill({json:[]});
 });
 await page.goto('http://localhost:5173/admin');
 await expect(page.getByText('editor@example.test')).toBeVisible();
 const statuses=await page.evaluate(async()=>{
  // Exercise the application's actual Axios client in the Vite development server.
  const {apiClient}=await import('/src/api/apiClient.ts');
  return Promise.all(['/api/test-a','/api/test-b'].map(path=>apiClient.get(path).then((r:{status:number})=>r.status)));
 });
 expect(statuses).toEqual([200,200]);expect(refreshes).toBe(1);
 const failed=await page.evaluate(async()=>{
  const {apiClient}=await import('/src/api/apiClient.ts');
  try{await apiClient.get('/api/always-401');return false;}catch{return true;}
 });
 expect(failed).toBe(true);expect(refreshes).toBe(2);
});
