import {test,expect} from '@playwright/test';

test('public registration confirms password and updates the account state',async({page})=>{
 let attempts=0;
 await page.route('**/api/auth/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/auth/csrf')return route.fulfill({json:{token:'test-csrf'}});
  if(path==='/api/auth/register'){
   expect(route.request().headers()['x-csrf-token']).toBe('test-csrf');
   expect(route.request().postDataJSON()).toEqual({email:'new@example.test',password:'simplepassword',confirmPassword:'simplepassword'});
   attempts++;
   if(attempts===1)return route.fulfill({status:409,json:{message:'Email address is already registered.'}});
   return route.fulfill({json:{user:{id:23,email:'new@example.test',role:'User'}}});
  }
  return route.fulfill({status:401,json:{message:'Invalid session.'}});
 });
 await page.goto((process.env.SEARCH_WEB_URL??'http://localhost:3000')+'/login');
 await page.getByRole('button',{name:'Hesap oluştur'}).click();
 await page.getByLabel('E-posta',{exact:true}).fill('new@example.test');
 await page.getByLabel('Şifre',{exact:true}).fill('simplepassword');
 await page.getByLabel('Şifre tekrar',{exact:true}).fill('differentpassword');
 await page.getByRole('button',{name:'Kayıt ol',exact:true}).click();
 await expect(page.getByRole('main').getByRole('alert')).toHaveText('Şifreler eşleşmiyor.');expect(attempts).toBe(0);
 await page.getByLabel('Şifre tekrar',{exact:true}).fill('simplepassword');
 await page.getByRole('button',{name:'Kayıt ol',exact:true}).click();
 await expect(page.getByRole('main').getByRole('alert')).toHaveText('Email address is already registered.');
 await page.getByRole('button',{name:'Kayıt ol',exact:true}).click();
 await expect(page.getByRole('button',{name:'Çıkış yap'})).toBeVisible();
 await expect(page.getByText('new@example.test — User',{exact:true})).toBeVisible();
 await expect(page.locator('select')).toHaveCount(0);
});
