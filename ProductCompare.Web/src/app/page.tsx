import { getCategories, getProducts } from '@/lib/api/catalog';
import { CatalogExplorer } from '@/components/product/CatalogExplorer';
export const dynamic='force-dynamic';
export default async function Home(){const [categories,products]=await Promise.all([getCategories(),getProducts({pageSize:12})]);return <CatalogExplorer categories={categories.filter(c=>c.isActive)} products={products.items}/>;}

