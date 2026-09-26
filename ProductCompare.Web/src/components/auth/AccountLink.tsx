'use client';
import Link from 'next/link';
import {useAuth} from './AuthProvider';
export function AccountLink(){const {user,loading}=useAuth();return loading?null:<Link href="/login">{user?user.email:'Giriş yap'}</Link>;}
