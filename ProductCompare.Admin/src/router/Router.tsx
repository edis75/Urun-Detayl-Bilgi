import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Dashboard } from '../pages/Dashboard/Dashboard';
import { Categories } from '../pages/Categories/Categories';
import { CategoryAttributes } from '../pages/Categories/CategoryAttributes';
import { Brands } from '../pages/Brands/Brands';
import { Attributes } from '../pages/Attributes/Attributes';
import { Products } from '../pages/Products/Products';
import { ProductEditor } from '../pages/Products/ProductEditor';
import { ProductDetail } from '../pages/Products/ProductDetail';
export function Router(){return <Routes><Route path="/" element={<Navigate to="/admin" replace/>}/><Route path="/admin" element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="categories" element={<Categories/>}/><Route path="categories/:id/attributes" element={<CategoryAttributes/>}/><Route path="brands" element={<Brands/>}/><Route path="attributes" element={<Attributes/>}/><Route path="products" element={<Products/>}/><Route path="products/new" element={<ProductEditor/>}/><Route path="products/:id/edit" element={<ProductEditor/>}/><Route path="products/:id" element={<ProductDetail/>}/><Route path="*" element={<section className="empty"><h1>Sayfa bulunamadı</h1><Link to="/admin">Dashboard'a dön</Link></section>}/></Route><Route path="*" element={<Navigate to="/admin" replace/>}/></Routes>;}
