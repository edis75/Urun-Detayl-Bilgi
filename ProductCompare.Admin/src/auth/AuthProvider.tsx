import {createContext,useContext,useEffect,useState,type ReactNode,type FormEvent} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {apiClient,errorMessage} from '../api/apiClient';
type AuthUser={id:number;email:string;role:'User'|'Editor'};
const Context=createContext<{user:AuthUser|null;loading:boolean;login:(email:string,password:string)=>Promise<void>;logout:()=>Promise<void>}|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<AuthUser|null>(null);const [loading,setLoading]=useState(true);const cache=useQueryClient();
 useEffect(()=>{let active=true;const expired=()=>{setUser(null);cache.clear();};window.addEventListener('auth-expired',expired);
  apiClient.get<AuthUser>('/api/auth/me').then(r=>{if(active)setUser(r.data);}).catch(()=>{if(active)setUser(null);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;window.removeEventListener('auth-expired',expired);};},[cache]);
 async function login(email:string,password:string){const r=await apiClient.post<{user:AuthUser}>('/api/auth/login',{email,password});cache.clear();setUser(r.data.user);}
 async function logout(){await apiClient.post('/api/auth/logout');cache.clear();setUser(null);}
 return <Context.Provider value={{user,loading,login,logout}}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider required');return value;}
export function EditorGate({children}:{children:ReactNode}){
 const {user,loading,login,logout}=useAuth();const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const data=new FormData(e.currentTarget);setBusy(true);setError('');try{await login(String(data.get('email')),String(data.get('password')));}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 if(loading)return <p>Oturum yükleniyor…</p>;
 if(!user)return <section className="empty"><h1>Editör girişi</h1><form onSubmit={submit}><label>E-posta <input name="email" type="email" autoComplete="username" maxLength={254} required/></label><label>Şifre <input name="password" type="password" autoComplete="current-password" maxLength={1024} required/></label><button disabled={busy}>Giriş yap</button></form>{error&&<p role="alert">{error}</p>}</section>;
 return <><div><span>{user.email}</span> <button disabled={busy} onClick={async()=>{setBusy(true);try{await logout();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}}>Çıkış yap</button>{error&&<p role="alert">{error}</p>}</div>{user.role==='Editor'?children:<p>Bu alan için Editör yetkisi gerekiyor.</p>}</>;
}
