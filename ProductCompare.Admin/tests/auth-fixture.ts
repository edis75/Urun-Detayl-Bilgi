import {test as base,expect,type APIRequestContext,type BrowserContext} from '@playwright/test';

export async function loginEditor(request:APIRequestContext,context:BrowserContext){
 const email=process.env.E2E_EDITOR_EMAIL,password=process.env.E2E_EDITOR_PASSWORD;
 base.skip(!email||!password,'Set E2E_EDITOR_EMAIL and E2E_EDITOR_PASSWORD for live Editor checks against the migrated API.');
 const api=process.env.API_URL??'http://localhost:5080';
 const csrf=await request.get(api+'/api/auth/csrf');expect(csrf.ok()).toBeTruthy();
 const login=await request.post(api+'/api/auth/login',{data:{email,password},headers:{'X-CSRF-TOKEN':(await csrf.json()).token}});
 expect(login.ok()).toBeTruthy();expect((await login.json()).user.role).toBe('Editor');
 await context.addCookies((await request.storageState()).cookies);
 return {api,token:(await (await request.get(api+'/api/auth/csrf')).json()).token as string};
}
export const test=base.extend({
 request:async({playwright,context},use)=>{
  const initial=await playwright.request.newContext();
  try{
   const {token}=await loginEditor(initial,context);
   const authenticated=await playwright.request.newContext({storageState:await initial.storageState(),extraHTTPHeaders:{'X-CSRF-TOKEN':token}});
   try{await use(authenticated);}finally{await authenticated.dispose();}
  }finally{await initial.dispose();}
 }
});
export {expect};
