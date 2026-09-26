'use client';
export type AuthUser = { id:number; email:string; role:'User'|'Editor' };
let refreshing:Promise<void>|null=null;
async function send(path:string,init:RequestInit={}):Promise<Response>{
 const base=process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/,'');
 if(!base)throw new Error('API adresi yapılandırılmamış.');
 const headers=new Headers(init.headers);
 if(!['GET','HEAD'].includes((init.method??'GET').toUpperCase())){
  const csrf=await fetch(base+'/api/auth/csrf',{credentials:'include',cache:'no-store'});
  if(!csrf.ok)throw new Error('Oturum doğrulanamadı.');
  headers.set('X-CSRF-TOKEN',(await csrf.json()).token);
 }
 return fetch(base+path,{...init,headers,credentials:'include',cache:'no-store'});
}
export async function authRequest<T>(path:string,init:RequestInit={}):Promise<T>{
 let response=await send(path,init);
 if(response.status===401&&!['/api/auth/login','/api/auth/register','/api/auth/refresh','/api/auth/logout'].includes(path)){
  refreshing??=send('/api/auth/refresh',{method:'POST'}).then(r=>{if(!r.ok)throw new Error('Oturum sona erdi.');}).finally(()=>{refreshing=null;});
  try{await refreshing;response=await send(path,init);}catch{window.dispatchEvent(new Event('auth-expired'));}
 }
 if(!response.ok){if(response.status===401&&!['/api/auth/login','/api/auth/register'].includes(path))window.dispatchEvent(new Event('auth-expired'));throw new Error((await response.json().catch(()=>null))?.message??'İşlem tamamlanamadı.');}
 return response.status===204?undefined as T:response.json();
}
