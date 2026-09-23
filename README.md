# ProductCompare — 1. aşama

.NET 10 / ASP.NET Core Web API / PostgreSQL ürün kataloğu. Tek uygulama projesi; controller → service → EF Core akışı.

## Yapı

```text
ProductCompare.sln
ProductCompare.Admin/   React + TypeScript + Vite yönetim paneli
ProductCompare.Web/     Next.js + TypeScript App Router public katalog
ProductCompare.Api/
  Controllers/
  Data/                 AppDbContext, development seed
  DTOs/
    Categories/
    Brands/
    Attributes/
    Products/
  Entities/
  Enums/
  Services/
  Migrations/
  Program.cs
  appsettings.json
  appsettings.Development.json
scripts/smoke-test.ps1
compose.yaml
.config/dotnet-tools.json
```

## Entity ve tablolar

| Entity | Tablo | Anahtar |
|---|---|---|
| Category | Categories | Id |
| Brand | Brands | Id |
| AttributeDefinition | AttributeDefinitions | Id |
| CategoryAttribute | CategoryAttributes | CategoryId + AttributeDefinitionId |
| Product | Products | Id |
| ProductAttributeValue | ProductAttributeValues | ProductId + AttributeDefinitionId |

EF ayrıca `__EFMigrationsHistory` tablosunu yönetir. Category, Brand, AttributeDefinition ve Product UTC oluşturulma/güncellenme zamanlarına sahiptir.

## Kurulum ve çalıştırma

Gerekenler: .NET 10 SDK, PostgreSQL (yerelde 18 ile doğrulandı).

Solution klasöründe:

```powershell
dotnet restore
dotnet tool restore
dotnet build
dotnet ef database update --project ProductCompare.Api -- --environment Development
dotnet run --project ProductCompare.Api
```

Development bağlantısı `appsettings.Development.json` içindedir:
localhost:5432 / productcompare_db / postgres / postgres.
Bu şifre yalnızca yerel geliştirme içindir. Gerçek bağlantıyı ortam değişkeni
`ConnectionStrings__DefaultConnection` veya bir secret sağlayıcısıyla verin.

EF, PostgreSQL kullanıcısında CREATEDB yetkisi varsa database'i oluşturur.
Aksi halde PostgreSQL yöneticisi ile:

```sql
CREATE DATABASE productcompare_db OWNER postgres;
```

Alternatif olarak Docker Desktop çalışıyorken:

```powershell
docker compose up -d
```

5432 üzerinde zaten PostgreSQL çalışıyorsa Docker alternatifini aynı portta başlatmayın.

- Swagger: http://localhost:5080/swagger
- OpenAPI JSON: http://localhost:5080/swagger/v1/swagger.json
- Swagger yalnızca Development ortamında etkindir.
- Seed yalnızca Development ve `SeedData:Enabled=true` iken çalışır.
- Migration otomatik startup işlemi değildir; önce yukarıdaki database update komutunu çalıştırın.
- Seed'i kapatmak için `SeedData__Enabled=false` kullanın.

## Endpointler

| Yöntem | Yol | İşlem |
|---|---|---|
| GET / POST | /api/categories | Listele / oluştur |
| GET / PUT / DELETE | /api/categories/{id} | Detay / güncelle / sil |
| GET / POST | /api/categories/{id}/attributes | Özellikleri getir / ata |
| DELETE | /api/categories/{id}/attributes/{attributeId} | Atamayı kaldır |
| GET / POST | /api/brands | Listele / oluştur |
| GET / PUT / DELETE | /api/brands/{id} | Detay / güncelle / sil |
| GET / POST | /api/attributes | Listele / oluştur |
| GET / PUT / DELETE | /api/attributes/{id} | Detay / güncelle / sil |
| GET / POST | /api/products | Sayfalı liste / oluştur |
| GET / PUT / DELETE | /api/products/{id} | Detay / güncelle / sil |
| GET | /api/products/by-slug/{slug} | Slug ile detay |

Ürün filtresi: `categoryId`, `brandId`, `isActive`, `page=1`, `pageSize=20`.
pageSize 1–100 aralığında olmalıdır; geçersiz sayfalama 400 döner.
Sonuç: items, page, pageSize, totalCount, totalPages.

Swagger'da kategori → özellik tanımı → kategoriye atama → marka → ürün akışı kullanılabilir.
Ürün örnekleri `ProductCompare.Api/ProductCompare.Api.http` dosyasındadır.

## İş kuralları ve mimari kararlar

- Entity'ler request/response olarak açılmaz; DTO kullanılır. Servisler doğrudan DbContext kullanır.
- Slug isimden üretilir, Türkçe karakterler normalize edilir; çakışmada -2, -3 eklenir.
  İsim güncellenirse slug yeniden üretilir. Eşzamanlı unique çakışması 409 döner.
- Attribute Code küçük ASCII harf, rakam ve alt çizgiden oluşur, harfle başlar ve değiştirilemez.
  Kullanılan attribute'un DataType değişikliği engellenir.
- Özellikte veri tipine uygun tam bir değer gerekir. Boolean false ve Number 0 geçerlidir.
  Boş metin, birden çok değer, yinelenen özellik, kategori dışı özellik, eksik zorunlu özellik reddedilir.
- DateValue UTC olmalı: örnek `2026-01-01T00:00:00Z`.
- PUT tam değiştirme işlemidir; Attributes listesinin tamamını gönderin.
  Gönderilmeyen eski özellikler silinir. Yeni kategori kuralları tekrar doğrulanır.
- Ürün yazmaları ve kategori kuralı değişiklikleri Serializable transaction kullanır.
  Eşzamanlı işlem çatışmaları 409 döner; istemci işlemi yeniden deneyebilir.
- Alt kategoriler üst kategorinin özelliklerini otomatik miras almaz.
- Kategori döngüleri engellenir. Alt kategori, ürün veya özellik ataması olan kategori silinemez.
- Kullanılan marka/özellik silinemez. Kullanılan kategori özelliği kaldırılamaz.
  Mevcut ürünleri eksik bırakacak zorunlu özellik ataması reddedilir.
- Ana veri foreign key'leri RESTRICT; yalnızca ürün → özellik değerleri CASCADE.
- Slug/Code unique indexleri; ürün BrandId, CategoryId, IsActive indexleri bulunur.
  Composite PK'lerin ilk kolonları ProductId / CategoryId sorgularını zaten destekler;
  bu kolonlar için gereksiz ikinci index oluşturulmaz.
- PostgreSQL check constraint'leri negatif fiyatı, geçersiz enum'u ve birden fazla/boş değer kolonunu engeller.
  Özellik veri tipi ve kategori kuralları serviste doğrulanır; doğrudan SQL yazmaları servis doğrulamasını atlar.
- Ürün detayının ilişkileri tek SQL sorgusunda yüklenir; görüntüleme sıraları ikinci toplu sorguda alınır.
  Liste boyutuna göre sorgu sayısı artmaz (N+1 yok).
- Fiyat numeric(18,2), Currency üç büyük harf, Description text, NumericValue numeric, tarihler timestamptz.
- Hatalar `{ message, errors }` biçimindedir. Validation 400, bulunamama 404,
  duplicate/ilişki çatışması 409, beklenmeyen hata 500. Yanıtlara stack trace konmaz.
- Günlükler konsola yazılır; Windows Event Log yazma iznine ihtiyaç duyulmaz.

## Migration

`20260915175117_InitialProductCatalog` ve model snapshot oluşturuldu.

```powershell
dotnet ef migrations has-pending-model-changes --project ProductCompare.Api -- --environment Development
dotnet ef migrations script --project ProductCompare.Api --output catalog.sql -- --environment Development
```

## Seed

- Elektronik → Telefon, Laptop
- Apple, Samsung, Xiaomi, Lenovo, Asus
- RAM, Depolama, Ekran Boyutu, Yenileme Hızı, Batarya Kapasitesi, İşlemci, 5G, GPU
- Telefon: 7; Laptop: 6 özellik ataması
- RAM, Depolama ve İşlemci zorunlu; diğerleri isteğe bağlı
- Apple iPhone 14 Pro 256 GB: 7 özellik
- Apple iPhone 15 Pro 256 GB: 6 özellik

Fiyatlar test verisidir. Seed sabit slug/code kontrolleriyle idempotent çalışır,
mevcut kayıtları yeniden yazmaz; paralel seed çalışmaları PostgreSQL advisory lock ile sıralanır.

## NuGet

| Paket | Sürüm |
|---|---|
| Microsoft.EntityFrameworkCore | 10.0.12 |
| Microsoft.EntityFrameworkCore.Design | 10.0.12 |
| Npgsql.EntityFrameworkCore.PostgreSQL | 10.0.2 |
| Swashbuckle.AspNetCore | 10.2.3 |
| dotnet-ef (yerel araç) | 10.0.12 |

Sürüm kaynakları: [EF Core](https://www.nuget.org/packages/Microsoft.EntityFrameworkCore/10.0.12),
[Npgsql provider](https://www.nuget.org/packages/Npgsql.EntityFrameworkCore.PostgreSQL/10.0.2).

## Doğrulama

API çalışırken:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke-test.ps1
```

Script kendine ait geçici test kayıtlarını oluşturur ve finally bloğunda temizler.
Swagger, CRUD, Türkçe slug ve çakışma, kategori döngüsü, zorunlu/yanlış/tekrarlı özellikler,
UTC tarih, veri tipi değişiklik koruması, ürün kategori değişikliği, başarısız update atomikliği,
silme korumaları, inactive kayıtlar, timestamp ve sayfalama kontrollerini içerir.

## Sonraki aşamalar

Arama, karşılaştırma motoru, kullanıcı/authentication, yorumlar, mağaza teklifleri,
fiyat geçmişi, Elasticsearch, Redis ve diğer ileri özellikler bu aşamada eklenmedi.

## Admin ve Public Web (2–3. aşama)

Mevcut backend'e bağlı iki ayrı frontend bulunur. Node.js 24 ile build ve test
yapılır. Her uygulamanın bağımlılıkları kendi klasöründe kurulmalıdır.
PostgreSQL ve API'yi yukarıdaki komutlarla başlattıktan sonra ayrı terminallerde:

```powershell
cd ProductCompare.Admin
npm ci
# .env.local yoksa örnek dosyadan oluşturun:
Copy-Item .env.example .env.local
npm run dev
```

```powershell
cd ProductCompare.Web
npm ci
# .env.local yoksa örnek dosyadan oluşturun:
Copy-Item .env.example .env.local
npm run dev
```

Mevcut `.env.local` dosyanız varsa kopyalama adımını atlayın.

| Uygulama | Adres | Ortam değişkeni |
|---|---|---|
| PostgreSQL | localhost:5432 | `ConnectionStrings__DefaultConnection` (API) |
| API | http://localhost:5080/swagger | Development launch profile |
| Admin | http://localhost:5173/admin | `VITE_API_BASE_URL=http://localhost:5080` |
| Public Web | http://localhost:3000 | `NEXT_PUBLIC_API_BASE_URL=http://localhost:5080` |

API base URL değerlerine `/api` eklemeyin; merkezi istemciler endpoint yolunu ekler.
Env değişikliklerinden sonra frontend sunucusunu yeniden başlatın. Admin build'i
Vite değişkenini derleme sırasında alır. Public API çağrıları sunucuda yapılır.
Development CORS sadece `http://localhost:5173` ve `http://localhost:3000`
origin'lerine açıktır. Production için aynı origin reverse proxy veya açıkça
belirlenen origin politikası yapılandırılmalıdır; `AllowAnyOrigin` kullanılmaz.

Admin route'ları: `/admin`, `/admin/products`, `/admin/products/new`,
`/admin/products/{id}`, `/admin/products/{id}/edit`, `/admin/categories`,
`/admin/categories/{id}/attributes`, `/admin/brands`, `/admin/attributes`.
Public route'ları: `/`, `/kategori/{slug}`, `/urun/{slug}`.

Ürün formu kategori özelliklerini API'den okuyarak Text/Number/Boolean/Date
alanlarını üretir. Boolean checkbox başlangıçta “Belirtilmedi” durumundadır;
işaretli “Var”, işaretsiz “Yok” olur, “Temizle” ile belirtilmedi durumuna döner.
Zorunlu Boolean için açık bir cevap gerekir; `false` geçerlidir. Tarihler UTC
gece yarısı olarak gönderilir. Public teknik özellikler aynı dinamik listeden
render edilir. Yeni özellik için frontend kodu değişmez.

Karşılaştırma düğmesi “Yakında” durumundadır; karşılaştırma motoru RoadMap'in
4. aşamasıdır. Authentication/login ve diğer ileri özellikler eklenmemiştir.

### Build ve uçtan uca doğrulama

```powershell
dotnet build
npm --prefix ProductCompare.Admin run build
npm --prefix ProductCompare.Web run build
```

Public production sunucusu için Web klasöründe `npm run build` ardından
`npm run start` kullanın. Aynı portta dev ve production sunucusunu birlikte açmayın.

API, Admin ve Public Web yukarıdaki portlarda çalışırken:

```powershell
cd ProductCompare.Admin
npx playwright install chromium
npm run test:e2e
```

Testler mevcut PostgreSQL'e gerçek API üzerinden bağlanır; kendilerine ait geçici
ürün/özellik/kategori kayıtlarını oluşturup sonunda temizler. Seed'deki Telefon,
Apple, RAM, Depolama, İşlemci ve 5G kayıtları kullanılır. Create → list → edit →
public category → detail, yeni dinamik özellik, Boolean false, Number 0, UTC Date,
zorunlu alanlar, kategori değişimi, metadata, 404 ve mobil görünüm kontrol edilir.
Ekran görüntüleri `artifacts/` altında oluşur. Ayrıntılı audit ve doğrulama
sonuçları [AUDIT.md](AUDIT.md) dosyasındadır.

Public 404 notu: Next.js `loading.tsx` ile yanıtı stream ettiğinde HTTP durumu
200 kalabilir; bulunamayan kayıt için 404 ekranı ve `noindex` etiketi üretilir.
API bulunamayan ürün slug'ında HTTP 404 döndürür. Testler bu ayrımı gözetir.

### Elasticsearch altyapısı

`Elastic.Clients.Elasticsearch 8.12.1`, Elasticsearch 8.12.0 sunucusu ile kullanılır.
`ProductCompare.Api/appsettings.json` içindeki `Elasticsearch` bölümünde `Url`,
`ProductIndex` (alias: `products`) ve `ProductPhysicalIndex` (`products_v3`) bulunur.
Ortam değişkenleriyle örneğin `Elasticsearch__Url` üzerinden değiştirilebilir.
API başlangıcında eksik index ve alias oluşturulur; mevcut index silinmez ve
mevcut alias başka bir sürüme taşınmışsa korunur. Elasticsearch erişilemiyorsa
uyarı loglanır, PostgreSQL endpointleri çalışmaya devam eder.

```powershell
Invoke-RestMethod -Method Post http://localhost:5080/api/admin/search/reindex
Invoke-RestMethod http://localhost:9200/_alias/products
Invoke-RestMethod http://localhost:9200/products/_count
```

Reindex, eksik index/alias kurulumunu tekrar dener ve PostgreSQL'den 500 ürünlük
salt okunur, Id sıralı batch'ler alıp Bulk API ile alias'a yazar. Yanıtın
`indexedCount` alanı aktarılan ürün sayısıdır; işlem sonunda refresh yapılır.
Ürün Id'si document `_id` olduğundan tekrar çalıştırmak duplicate oluşturmaz.
Bulk kısmen başarısız olursa istek başarısız döner; reindex tekrar çalıştırılabilir.
Marka, kategori ve özellikler tek merkezi EF projection ile yüklenir.
Kimlikler `long`, fiyat `scaled_float` (100), dinamik özellikler `nested` olarak
eşlenir. Sayısal özellikler Elasticsearch'te `double` arama hassasiyetindedir;
PostgreSQL'deki asıl `decimal` değerler değişmez.

Bu aşamada create/update/delete işlemleri otomatik index senkronizasyonu yapmaz.
Reindex mevcut ürünleri ekler/günceller; PostgreSQL'den silinmiş ürünlerin eski
document'lerini temizlemez. Tekil index/silme metotları sonraki entegrasyon için
hazırdır. Entity, DbContext ve migration değişikliği yoktur.
Projede authentication/authorization bulunmadığından reindex endpointi de
mevcut API gibi kimlik doğrulamasızdır; `admin` route adı erişim kontrolü sağlamaz.

### Search API

`GET /api/search?q=iphone%2015&page=1&pageSize=20`, yalnızca configuration'daki
`Elasticsearch:ProductIndex` alias'ından arar. `multi_match` alanları `name^6`,
`brandName^4`, `categoryName^2` şeklindedir. Varsayılan OR davranışı korunur:
`iphone 15` iki ürünü de bulabilir ancak iPhone 15 daha yüksek skor alır;
`A17 Pro` ürün adındaki `Pro` nedeniyle diğer ürünlerle de eşleşebilir.
Root sorgu, `attributes` nested sorgusuyla `bool.should` / `minimum_should_match=1`
üzerinden birleşir. Nested alanlar `attributes.textValue^3`, `attributes.name^1`
ve `attributes.code` şeklindedir. Sonuçlar Elasticsearch skor sırasındadır.
`<number> <unit>` biçimi (ör. `120 Hz`, `24 Ay`, `6.1 inch`, `0.187 KG`)
invariant culture ile ayrıştırılır; sayı ve birim aynı nested nesnede exact term
ile eşleşir. Ondalık ayırıcı noktadır; birimler keyword mapping nedeniyle
büyük/küçük harfe duyarlıdır. Numeric alan full-text sorgusuna dahil edilmez.
Root arama her zaman korunur. `name` için `match_phrase` boost 12 eklenir.
Yalnızca name/brandName üzerinde boost 0.3, `AUTO:4,7`, prefix_length 1 ve
max_expansions 25 ile fuzzy destek vardır; dört karakterden kısa token'larda
fuzzy edit yapılmaz. Bu ağırlıklar mevcut iki örnek ürünle doğrulanmıştır;
aksesuar/ürün ayrımı için ayrı bir kategori sıralama kuralı yoktur.

Yanıt mevcut `total` (Int64), `page`, `pageSize`, `items` alanlarını korur ve
ek olarak `facets` döndürür.
Her item kimlik, ad, marka/kategori kimliği ve adı, fiyat ve `score` içerir.
Hem sorgu hem kategori boşsa, page < 1, pageSize 1–100 dışında veya ilk 10000 sonuç penceresini
aşan sayfalama HTTP 400 döndürür. Elasticsearch hataları mevcut hata işleyicisi
ile loglanır ve HTTP 500 döner; PostgreSQL'e fallback yapılmaz.

**Türkçe normalizasyon ve index geçişi:** `products_v2` içindeki `product_text`
analyzer standard tokenizer → Turkish lowercase → asciifolding kullanır.
Stemming yoktur; name, brandName, categoryName ve nested text/name alanlarına
uygulanır. Exact keyword alt alanları filtre/facet değerlerini olduğu gibi korur.
Mevcut field analyzer'ları yerinde değiştirilmez.

```powershell
# Yalnızca yeni, boş ve henüz aktif olmayan ProductPhysicalIndex hedefine geçiş:
Invoke-RestMethod -Method Post http://localhost:5080/api/admin/search/migrate-index
```

Bu işlem aynı mapper ve 500 kayıtlık bulk akışını kullanır; PostgreSQL'de
repeatable-read snapshot alır. Bulk hatası veya kayıt sayısı farkında alias
taşınmaz. Başarılı aktarım/refresh/sayım sonrası alias tek `_aliases` isteğinde
atomik değiştirilir. Eski index silinmez. Bu sürümde `products → products_v2`
geçişi tamamlandı; `products_v1` korunmuştur. Normal reindex aktif alias'a
yazmaya devam eder; uygulama başlangıcı otomatik migration/reindex yapmaz.
Geçişi ürün yazımlarının durduğu bakım aralığında ve tek operatörle çalıştırın;
henüz otomatik CRUD senkronizasyonu yoktur. Kısmi aktarım sonrası dolu hedef
otomatik temizlenmez; operatör yeni boş bir versioned hedef seçmelidir.
Migration endpointi mevcut admin endpointleri gibi auth eklemez.

**Suggestions:** `GET /api/search/suggestions?q=iph`, aynı alias üzerinde
`match_phrase_prefix` (max_expansions 25) kullanır; yalnız aktif ürünlerden
en fazla 10 öneri döndürür. İki karakterden kısa sorgular Elasticsearch'e
gönderilmeden `[]` döner. Yanıt sadece id/name/brandName/categoryName/currentPrice
içerir; `_source` alanları da bunlarla sınırlıdır. Ayrı index veya frontend UI yoktur.

**Filtreler ve facets:**

```http
GET /api/search?q=iphone&categoryId=2&brandIds=1&brandIds=2&minPrice=30000&maxPrice=80000&isActive=true&filters[ram]=8&filters[storage]=256&filters[has_5g]=true
```

BrandIds tekrarlı query parametresidir (virgüllü liste değil). Dinamik filtreler
için categoryId zorunludur. CategoryAttribute.IsFilterable metadata'sı tek
PostgreSQL sorgusuyla DisplayOrder sırasıyla okunur; bilinmeyen, filtrelenemez
veya tipi hatalı filtreler HTTP 400 verir. Numeric (noktalı ondalık), Boolean,
Text (exact/case-sensitive keyword) ve Date (UTC anına karşılık gelen exact
milisaniye) değerleri desteklenir. Birden fazla attribute filtresi AND, brandIds
OR mantığındadır. Code+value her filtrede aynı nested nesneye bağlanır.
Tüm filtreler `bool.filter` içindedir; skorları değiştirmez.
Mevcut davranış korunur: isActive belirtilmezse Search API aktiflik filtresi
uygulamaz. Boş q hâlâ HTTP 400 döndürür; yalnız filtreli gezinme eklenmemiştir.

`facets.brands` id/name/count, `minPrice`/`maxPrice` fiyat sınırları ve
`facets.attributes` code/name/unit/dataType/displayOrder/values içerir.
Örnek RAM values: `[{"value":6,"count":1},{"value":8,"count":1}]`.
Sayım tüm filtrelenmiş sonuçlar üzerindedir, yalnız mevcut sayfa üzerinde değildir.
Kategori seçilmezse attribute facets boş döner. Seçilirse yalnız filterable
attribute'lar üretilir; her code altında ilgili değer alanı aggregate edilir.
Brand ve her attribute için en fazla 100 değer döndürülür (terms aggregation'ın
en sık değerleri). Self-excluding facets, numeric attribute range, synonym ve
otomatik sync eklenmemiştir.

İki örnek iPhone indexte mevcutken salt okunur arama testleri:

```powershell
./scripts/search-smoke-test.ps1 -BaseUrl http://localhost:5080
```


### Kategori ağacı ve kategori üzerinden arama

Mevcut Category şeması zaten parent FK, unique slug, DisplayOrder ve IsActive içerdiği için yeni EF migration yoktur. Product.CategoryId korunur; join table eklenmez.

- GET /api/categories/tree: tek kategori sorgusuyla aktif, DisplayOrder/Id sıralı ağaç. Pasif ataların alt dalları yayınlanmaz.
- GET /api/categories/by-slug/{slug}: parent, immediate children ve kökten başlayan breadcrumb.
- Category CRUD isteği opsiyonel slug kabul eder; mevcut SlugService normalizasyonunu kullanır. Explicit slug çakışması reddedilir; slug gönderilmeyen güncellemelerde URL korunur. Parent döngüsü tek kategori snapshot'ında doğrulanır.
- Kategori listesinde pathName ve isSelectable admin seçeneklerini besler. Ürün oluşturma/güncelleme aktif atalara sahip aktif leaf ister.
- GET /api/search?categoryId=1&page=1&pageSize=24: kategori-only listeleme. bool.filter içindeki categoryPathIds terimi tüm subtree'yi kapsar; q varsa mevcut relevance sorgusuyla birleşir.
- Search yanıtı mevcut items alanını korur. products alanı yalnızca Elasticsearch'ün seçtiği sayfanın kart detaylarını PostgreSQL'den toplu olarak yükler; ürün başına HTTP/SQL sorgusu yoktur. Sayım, filtreleme, sıralama ve sayfalama Elasticsearch'tedir.
- facets.children: immediate child başına aynı Elasticsearch isteğinde filters aggregation sayımı. facets.categories: leaf kategori dağılımı. Dinamik metadata sadece bağlam kategorisinin IsFilterable atamalarından gelir; child özellikleri birleştirilmez.
- categoryContext yalnızca benzersiz normalize ad/slug eşleşmesinde veya explicit categoryId ile verilir. Intent metin sonuçlarını otomatik daraltmaz ve redirect yapmaz. Arama sayfasında bu bağlamın filtresini uygulamak explicit categoryId gönderir.
- sort: relevance (metin varsa score DESC, tie-break Id DESC), newest (mevcut Id DESC), price_asc, price_desc. Kategori-only varsayılanı Id DESC. Yapay popularity alanı yoktur.

Mevcut /kategori/[slug] sayfası ve ProductCard korunur. Header içindeki kategori menüsü tree API kullanır; mobil ve klavyede açılır, seçimle kapanır. /arama sayfası ve kategori sayfası CatalogResults/FilterSidebar paylaşır. Filtreler, sıralama ve sayfa URL query string'inde saklanır. Marka/fiyat ve DataType tabanlı seçenekler API metadata ve aggregation değerlerinden çizilir; kategoriye özel hard-code yoktur.

**İndeks geçişi (24 Eylül 2026):** canlı products alias önce kontrol edildi: products_v2. Yeni products_v3 oluşturuldu; PostgreSQL'deki 2 ürün mevcut mapper/batch reindex ile aktarıldı, refresh ve kayıt sayımı sonrası alias atomik geçirildi. products_v1/products_v2 silinmedi. Yeni mapping: categoryPathIds (long), categoryPathNames (mevcut analyzer ile text), categoryPathSlugs (keyword). Kategori snapshot'ı reindex boyunca bir kez okunur; her path root → leaf sırasındadır. İndeks aktivasyonu ayrıca pathsiz dokümanları reddeder.

Mevcut manuel indeks senkronizasyonu korunmuştur: kategori adı/parent/aktiflik ve ürün değişikliklerinden sonra reindex çalıştırılmalıdır. Normal reindex silinmiş ürün dokümanlarını temizlemez; bu mevcut sınırlama değişmemiştir. Yeni version geçişlerinde önce alias hedefini okuyun, boş yeni fiziksel hedefi yapılandırın, yazımların durduğu bakım aralığında mevcut migrate-index endpointini kullanın. Başarısız hedef veya eski indeks otomatik silinmez.

Doğrulama:

- node scripts/category-smoke-test.mjs: geçici üç seviyeli ağaç, aktiflik, breadcrumb, slug/döngü, parent ürün reddi, telefon/buzdolabı metadata ayrımı, counts, intent, sorting, pagination, indexed paths. Test kendi oluşturduğu DB ve ES kayıtlarını temizler.
- powershell -File scripts/search-smoke-test.ps1: mevcut relevance, typo, Turkish normalization, autocomplete, nested attribute aramaları ve dinamik filtre regresyonları.
- ProductCompare.Admin altında npm run test:e2e -- tests/category.spec.ts tests/search.spec.ts: gerçek yerel API ile masaüstü/mobil kategori gezinmesi, URL filtresi, admin selector ve mevcut home search. API_URL, SEARCH_WEB_URL ve ADMIN_URL opsiyoneldir.
- dotnet build ProductCompare.sln; iki frontend klasöründe npm run build.
