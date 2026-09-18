import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Package, Layers3, Tags, SlidersHorizontal, ArrowRight, Plus } from 'lucide-react';
import { useCatalog } from '../../hooks/useCatalog';
import { productsApi } from '../../api/productsApi';
import { PageTitle, ErrorNotice, Loading } from '../../components/common/Ui';
export function Dashboard() {
 const {categories,brands,attributes}=useCatalog();
 const products=useQuery({queryKey:['products','dashboard'],queryFn:()=>productsApi.list({pageSize:1})});
 if([categories,brands,attributes,products].some(q=>q.isPending)) return <Loading/>;
 return <><PageTitle title="Kataloğunuza genel bakış" description="Ürünlerinizi, kategorilerinizi ve teknik özelliklerinizi tek yerden yönetin." action={<Link className="button primary" to="/admin/products/new"><Plus size={18}/>Yeni ürün</Link>}/>
 <ErrorNotice error={categories.error||brands.error||attributes.error||products.error}/>
 <div className="stats">{[[products.data?.totalCount,'Toplam ürün',Package,'products'],[categories.data?.length,'Kategori',Layers3,'categories'],[brands.data?.length,'Marka',Tags,'brands'],[attributes.data?.length,'Teknik özellik',SlidersHorizontal,'attributes']].map(([count,label,Icon,path])=>{const I=Icon as typeof Package;return <Link className="stat" key={String(path)} to={'/admin/'+path}><span className="stat-icon"><I size={22}/></span><span>{String(label)}</span><strong>{count===undefined?'—':String(count)}</strong><small>Kayıtları görüntüle <ArrowRight size={14}/></small></Link>;})}</div>
 <div className="dashboard-grid"><section className="panel welcome"><span className="eyebrow">DÜZENLİ VERİ, DAHA İYİ DENEYİM</span><h2>Her ürünün detayında<br/>iyi bir katalog var.</h2><p>Kategoriyi seçin, teknik özellikleri tanımlayın ve ürününüzü yayınlayın.</p><Link className="button primary" to="/admin/products/new">İlk adımdan başlayın <ArrowRight size={16}/></Link></section><section className="panel"><h2>Katalog adımları</h2>{[['01','Kategorileri düzenleyin','categories'],['02','Teknik özellikleri tanımlayın','attributes'],['03','Ürünlerinizi ekleyin','products']].map(([n,t,p])=><Link className="step" key={n} to={'/admin/'+p}><span>{n}</span><strong>{t}</strong><ArrowRight size={17}/></Link>)}</section></div></>;
}

