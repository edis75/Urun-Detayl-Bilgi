'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {authRequest,type AuthUser} from '@/lib/api/auth';
const Context=createContext<{user:AuthUser|null;loading:boolean;login:(email:string,password:string)=>Promise<void>;register:(email:string,password:string,confirmPassword:string)=>Promise<void>;logout:()=>Promise<void>}|null>(null);
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<AuthUser|null>(null);const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;const expired=()=>setUser(null);window.addEventListener('auth-expired',expired);
  authRequest<AuthUser>('/api/auth/me').then(u=>{if(active)setUser(u);}).catch(()=>{if(active)setUser(null);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;window.removeEventListener('auth-expired',expired);};},[]);
 async function login(email:string,password:string){const result=await authRequest<{user:AuthUser}>('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});setUser(result.user);}
 async function register(email:string,password:string,confirmPassword:string){const result=await authRequest<{user:AuthUser}>('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,confirmPassword})});setUser(result.user);}
 async function logout(){await authRequest('/api/auth/logout',{method:'POST'});setUser(null);}
 return <Context.Provider value={{user,loading,login,register,logout}}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider required');return value;}
