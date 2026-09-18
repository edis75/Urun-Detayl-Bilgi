'use client';
export default function ErrorPage({reset}:{error:Error&{digest?:string};reset:()=>void}){return <section className="container empty error-page"><span className="eyebrow">BAĞLANTI SORUNU</span><h1>Katalog şu anda yüklenemiyor.</h1><p>Lütfen biraz sonra tekrar deneyin.</p><button className="button primary" onClick={reset}>Tekrar dene</button></section>;}
