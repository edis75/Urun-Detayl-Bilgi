import Link from 'next/link';
export default function NotFound(){return <section className="container empty error-page"><span className="eyebrow">404 · SAYFA BULUNAMADI</span><h1>Aradığınız sayfa burada değil.</h1><p>Ürün kaldırılmış veya adres değişmiş olabilir.</p><Link className="button primary" href="/">Kataloğa dön →</Link></section>;}
