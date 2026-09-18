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
