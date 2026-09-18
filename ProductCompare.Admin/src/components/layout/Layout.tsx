import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Layers3, Tags, SlidersHorizontal, ArrowUpRight, PanelLeftClose } from 'lucide-react';
import { useState } from 'react';
const links=[['/admin','Dashboard',LayoutDashboard],['/admin/products','Ürünler',Package],['/admin/categories','Kategoriler',Layers3],['/admin/brands','Markalar',Tags],['/admin/attributes','Özellikler',SlidersHorizontal]] as const;
export function Layout() {
 const [open,setOpen]=useState(false);
 return <div className={'admin-shell '+(open?'nav-open':'')}><aside className="sidebar"><NavLink className="logo" to="/admin"><span className="logo-symbol">pc</span><span>ProductCompare<small>YÖNETİM PANELİ</small></span></NavLink><p className="nav-caption">ÇALIŞMA ALANI</p><nav aria-label="Admin menüsü">{links.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/admin'} onClick={()=>setOpen(false)}><Icon size={19}/>{label}</NavLink>)}</nav><div className="sidebar-bottom"><span className="dot"/><span>Ürün kataloğu<small>Veriyi düzenle. Keşfi kolaylaştır.</small></span></div></aside><div className="workspace"><header className="topbar"><button aria-label="Menüyü aç/kapat" className="mobile-menu icon-button" onClick={()=>setOpen(!open)}><PanelLeftClose/></button><span>ProductCompare <strong>Admin</strong></span><span className="top-label">Katalog çalışma alanı <ArrowUpRight size={15}/></span></header><main id="main-content"><Outlet/></main><footer className="admin-footer">ProductCompare <span>Ürün kataloğu yönetimi</span></footer></div></div>;
}

