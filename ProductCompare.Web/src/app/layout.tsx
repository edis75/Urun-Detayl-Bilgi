import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';
export const metadata:Metadata={title:{default:'ProductCompare — Ürünleri keşfet, detayları öğren',template:'%s | ProductCompare'},description:'Ürünlerin teknik özelliklerini ve detaylarını keşfedin.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr"><body><a href="#main-content" className="skip-link">İçeriğe geç</a><Header/><main id="main-content">{children}</main><Footer/></body></html>;}

