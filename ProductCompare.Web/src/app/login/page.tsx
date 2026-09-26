'use client';
import {useState,type FormEvent} from 'react';
import {useAuth} from '@/components/auth/AuthProvider';
export default function Login(){
 const {user,loading,login,register,logout}=useAuth();const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [registering,setRegistering]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget);setError('');
  const email=String(data.get('email')),password=String(data.get('password')),confirmation=String(data.get('confirmPassword'));
  if(registering&&password!==confirmation){setError('Şifreler eşleşmiyor.');return;}
  setBusy(true);try{if(registering)await register(email,password,confirmation);else await login(email,password);}catch(e){setError(e instanceof Error?e.message:'İşlem başarısız.');}finally{setBusy(false);}
 }
 return <section className="container"><h1>Hesap</h1>{loading?<p>Yükleniyor…</p>:user?<><p>{user.email} — {user.role}</p><button disabled={busy} onClick={async()=>{setBusy(true);try{await logout();}catch{setError('Çıkış yapılamadı.');}finally{setBusy(false);}}}>Çıkış yap</button></>:<><form key={String(registering)} onSubmit={submit}><label>E-posta <input name="email" type="email" autoComplete="username" maxLength={254} required/></label><label>Şifre <input name="password" type="password" autoComplete={registering?'new-password':'current-password'} minLength={registering?8:undefined} maxLength={registering?128:1024} required/></label>{registering&&<label>Şifre tekrar <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label>}<button disabled={busy}>{registering?'Kayıt ol':'Giriş yap'}</button></form><button disabled={busy} onClick={()=>{setRegistering(!registering);setError('');}}>{registering?'Zaten hesabım var':'Hesap oluştur'}</button></>}{error&&<p role="alert">{error}</p>}</section>;
}
