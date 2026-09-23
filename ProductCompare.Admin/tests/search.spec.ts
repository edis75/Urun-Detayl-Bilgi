import { test, expect } from '@playwright/test';

test('Home search renders Elasticsearch results in order and clears stale queries', async ({page,request})=>{
 test.setTimeout(90000);
 const errors:string[]=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 let searches=0;
 page.on('request',request=>{if(request.headers()['next-action'])searches++;});
 await page.goto(process.env.SEARCH_WEB_URL??'http://localhost:3000');
 const input=page.getByRole('textbox',{name:'Görüntülenen ürünlerde ara'});
 const names=page.locator('.product-card h3');
 const initial=await names.allTextContents();
 for(const query of ['iphone','telefon','apple','samsung','iphone 15']){
  const response=await request.get('http://localhost:5080/api/search?q='+encodeURIComponent(query));
  expect(response.ok()).toBeTruthy();
  const expected=(await response.json()).items.map((item:{name:string})=>item.name);
  const count=searches;
  await input.fill(query);
  await expect.poll(()=>searches).toBe(count+1);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(names).toHaveText(expected);
  await page.waitForTimeout(400);
  expect(searches).toBe(count+1);
 }
 const count=searches;
 await input.fill('telefon');
 await input.fill('samsung');
 await expect.poll(()=>searches).toBe(count+1);
 await expect(page.getByRole('status')).toHaveCount(0);
 await expect(names).toHaveCount(0);
 await input.fill('apple');
 await expect.poll(()=>searches).toBe(count+2);
 await input.fill('');
 await expect(names).toHaveText(initial);
 await page.waitForTimeout(1000);
 await expect(names).toHaveText(initial);
 expect(searches).toBe(count+2);
 expect(errors).toEqual([]);
});
