import { AuthProvider, EditorGate } from './auth/AuthProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Router } from './router/Router';
const client=new QueryClient({defaultOptions:{queries:{retry:1,staleTime:15000},mutations:{retry:false}}});
export default function App(){return <QueryClientProvider client={client}><AuthProvider><EditorGate><BrowserRouter><Router/></BrowserRouter></EditorGate></AuthProvider></QueryClientProvider>;}
