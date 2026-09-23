import Link from 'next/link';
export function CompareButton({productId}:{productId:number}){return <Link className="compare-button" href={'/compare?products='+productId}><span aria-hidden="true">⇄</span> Karşılaştır</Link>;}
