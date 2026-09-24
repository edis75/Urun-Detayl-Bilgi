# Cloudflare R2 çoklu ürün görselleri

## Mevcut yapı ve uyumluluk

Projede tek `Product.MainImageUrl` alanı ve Web/Admin `ProductImage` gösterim bileşenleri vardı. Backend'de `ProductImage` entity'si, `IR2StorageService` veya eşdeğer R2 servisi bulunamadı. Kullanıcının açık onayı üzerine eksik R2 servisi eklendi.

`MainImageUrl` kapak URL'si olarak korunur ve görsel işlemlerinde aynı transaction içinde güncellenir. Böylece kartlar, kategori/arama sonuçları ve karşılaştırma mevcut alanı kullanmaya devam eder. `primaryImageUrl` gibi ikinci bir kapak alanı eklenmedi. Elasticsearch ve karşılaştırma kodları değiştirilmedi. Eski harici URL'ler, üründe yeni görsel bulunmadığında kullanılmaya devam eder.

## Model

```csharp
public class ProductImage
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string ImageUrl { get; set; } = "";
    public string ObjectKey { get; set; } = "";
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
```

`Product.Images` bire çok ilişkidir. ProductId üzerinde `WHERE "IsPrimary" = TRUE` filtreli unique index, ürün başına en fazla bir kapak sağlar. Görsel mutasyonları aynı ürün satırını `FOR UPDATE` ile kilitler. Kapak değişiminde eski kapak önce false olarak kaydedilir; seçilen kapak aynı transaction içinde true yapılır. İlk yüklenen görsel, başka kapak seçilmemişse otomatik kapaktır. Yeni görseller en büyük SortOrder'dan devam eder. Detayda kapak, ardından SortOrder/Id sırası kullanılır.

## Endpoint'ler

| Metot | Yol | Davranış |
|---|---|---|
| POST | `/api/products/{productId}/images` | Multipart `Files` (1–10 dosya), isteğe bağlı sıfır tabanlı `PrimaryImageIndex` |
| PUT | `/api/products/{productId}/images/{imageId}/primary` | Aynı ürüne ait görseli kapak yapar |
| DELETE | `/api/products/{productId}/images/{imageId}` | R2 object ve metadata kaydını siler; kapak silinirse sıradaki görseli seçer |

Üç endpoint de güncel `ProductImageResponse[]` döndürür. Başka ürüne ait imageId için 404 döner. Mevcut JSON ürün create/update endpoint'leri korunur. Mevcut ID/slug detay endpoint'leri `images` dizisini döndürür; listeler tüm görselleri yüklemez/döndürmez. ObjectKey public DTO'larda yer almaz.

R2 yolu: `products/{productId}/{guid:N}.{uzantı}`. Kullanıcı dosya adı object key olarak kullanılmaz.

## JSON örnekleri

Aşağıdaki URL ve ID'ler örnektir; gerçek R2 yüklemesi yapılmadı.

Ürün detay yanıtından kesit:

```json
{
  "id": 25,
  "name": "Samsung Galaxy S25 Ultra 512 GB",
  "mainImageUrl": "https://cdn.example.com/products/25/abc.webp",
  "images": [
    { "id": 81, "imageUrl": "https://cdn.example.com/products/25/abc.webp", "isPrimary": true, "sortOrder": 0 },
    { "id": 82, "imageUrl": "https://cdn.example.com/products/25/def.png", "isPrimary": false, "sortOrder": 1 }
  ]
}
```

Liste öğesinden kesit:

```json
{
  "id": 25,
  "name": "Samsung Galaxy S25 Ultra 512 GB",
  "mainImageUrl": "https://cdn.example.com/products/25/abc.webp"
}
```

Mevcut diğer DTO alanları korunur; örnekler yalnızca ilgili alanları gösterir.

## Admin ve Web

- Admin create/edit formunda dosya seçimi, yerel önizleme, kapak radio seçimi ve silme vardır.
- Yeni ürün önce JSON olarak kaydedilir, gerçek ID alındıktan sonra dosyalar yüklenir. Upload hatasında ID saklanır; yeniden deneme ikinci ürün oluşturmaz.
- Dosyalar yalnızca seçildiklerinde yüklenir; normal ürün güncellemelerinde mevcut görseller yeniden yüklenmez.
- Mevcut görsellerin kapak değişimi ve silinmesi hemen uygulanır; UI bunu belirtir.
- Son görsel silinince eski/deleted R2 URL'sinin ürün kaydıyla yeniden yazılması önlenir.
- Web'de kapak ilk görünür; thumbnail tıklaması veya klavye ile görsel değişir. Görsel yoksa eski MainImageUrl/placeholder davranışı sürer.

## R2 yapılandırması

`appsettings.json` içine yalnızca boş alanlar eklendi. Diğer yapılandırma değerleri değiştirilmedi:

```json
"R2": {
  "AccessKey": "",
  "SecretKey": "",
  "AccountId": "",
  "Bucket": "",
  "PublicBaseUrl": ""
}
```

Değerleri backend ortamında yapılandırın. Ortam değişkeni karşılıkları `R2__AccessKey`, `R2__SecretKey`, `R2__AccountId`, `R2__Bucket`, `R2__PublicBaseUrl` şeklindedir. PublicBaseUrl, HTTPS üzerinden erişilen bucket public adresiniz/custom domain'iniz olmalıdır. Public erişim/bucket oluşturma bu kod tarafından yapılmaz. Anahtarlar frontend'e gönderilmez. Boş ayarlar API başlangıcını engellemez; yükleme isteği anlaşılır 503 yanıtı alır.

Yeni NuGet paketi: `AWSSDK.S3` **4.0.103.4**, transitif `AWSSDK.Core` **4.0.102.6**. Yeni npm veya ikon paketi eklenmedi. S3 endpoint'i `https://{AccountId}.r2.cloudflarestorage.com`, imza bölgesi `auto` kullanır. [Cloudflare .NET örneği](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-net/) ve [AWS S3 .NET yapılandırması](https://docs.aws.amazon.com/sdkfornet/v4/apidocs/items/S3/TS3Config.html) esas alındı.

## Doğrulama ve hata temizliği

- Tek doğrulama noktası R2StorageService'dir: JPG/JPEG/PNG/WebP uzantısı, dosya imzası, boş dosya ve dosya başına 10 MB sınırı.
- Bir multipart isteğinde en fazla 10 dosya; toplam request sınırı 105 MB.
- Batch yükleme başarısız olursa o istekte başarıyla yüklenen object key'ler takip edilerek bağımsız timeout ile silinmeye çalışılır. Zaman aşımına uğramış PUT için de benzersiz GUID key temizlenmeye çalışılır.
- Tek görsel silme sırasında R2 silme başarısızsa metadata transaction'ı geri alınır.
- Ürün silmede DB kaydı silindikten sonra bütün R2 object'leri için cleanup denenir. Bir object başarısız olsa bile diğerleri denenir; başarısız key'ler loglanır.
- R2 ve PostgreSQL arasında dağıtık transaction yoktur. Ağ/commit belirsizliği veya cleanup hatalarında tam atomiklik garanti edilmez; loglanan object key'ler gerektiğinde manuel temizlenmelidir. Kalıcı kuyruk/outbox eklenmedi.

## Migration ve çalıştırma

Migration: **`20260924124221_AddProductImages`**. Yalnızca ProductImages tablosu, foreign key, sıralama ve unique index'leri ekler. **Database update çalıştırılmadı.**

Mevcut API'yi durdurduktan sonra proje kökünden:

```powershell
dotnet ef database update --project ProductCompare.Api --configuration Release
dotnet run --project ProductCompare.Api --configuration Release
```

R2 ayarlarını doldurun ve API'yi güncel kodla başlatın. Migration uygulanmadan yeni API'nin görsel/detail sorguları çalışmaz. Çalışan eski API bu görev sırasında yeniden başlatılmadı.

## Kontroller

- API: `dotnet build ProductCompare.Api --configuration ImageFeature --no-restore` — başarılı, 0 hata/uyarı. Ayrı çıktı dizini, çalışan API dosyalarına dokunmamak için kullanıldı.
- Admin: `npm run build` — başarılı; mevcut büyük bundle uyarısı var.
- Web: `npm run typecheck`, `npm run build` — başarılı.
- `dotnet run --project tests/ProductCompare.ImageChecks --configuration ImageFeature` — uzantı/imza/boyut, boş config, key güvenliği, primary index, cascade ve public DTO kontrolleri başarılı. DB/R2 bağlantısı kurulmaz.
- Admin altında `npx playwright test tests/product-images.spec.ts` — taklit API ile oluştur/yükle, hata/tekrar deneme, primary, silme ve mobil kontrolleri geçti.
- Admin altında `npx playwright test tests/product-gallery.spec.ts` — gerçek Web bileşenlerini test düzeneğinde kullanarak primary, thumbnail, klavye ve mobil kontrolleri geçti. Çalışan Admin Vite sunucusunu kullanır.
- Gerçek R2 yükleme/silme ve yeni tablodaki canlı PostgreSQL transaction/eşzamanlılık testleri çalıştırılmadı: R2 ayarları boş ve migration kullanıcı tarafından uygulanacak.

## Bu özellik için dosyalar

Güncellenen:
- `ProductCompare.Api/Entities/Product.cs`
- `ProductCompare.Api/Data/AppDbContext.cs`
- `ProductCompare.Api/DTOs/Products/ProductResponse.cs`
- `ProductCompare.Api/Services/ProductService.cs`
- `ProductCompare.Api/Controllers/ProductsController.cs`
- `ProductCompare.Api/Program.cs`
- `ProductCompare.Api/ProductCompare.Api.csproj`
- `ProductCompare.Api/appsettings.json`
- `ProductCompare.Api/Migrations/AppDbContextModelSnapshot.cs`
- `ProductCompare.Admin/src/types/catalog.ts`
- `ProductCompare.Admin/src/api/productsApi.ts`
- `ProductCompare.Admin/src/pages/Products/ProductEditor.tsx`
- `ProductCompare.Admin/src/index.css`
- `ProductCompare.Web/src/types/catalog.ts`
- `ProductCompare.Web/src/app/urun/[slug]/page.tsx`
- `ProductCompare.Web/src/app/globals.css`

Yeni:
- `ProductCompare.Api/Entities/ProductImage.cs`
- `ProductCompare.Api/DTOs/Products/ProductImageResponse.cs`
- `ProductCompare.Api/Services/IR2StorageService.cs`
- `ProductCompare.Api/Services/R2StorageService.cs`
- `ProductCompare.Api/Services/ProductImageService.cs`
- `ProductCompare.Api/Migrations/20260924124221_AddProductImages.cs`
- `ProductCompare.Api/Migrations/20260924124221_AddProductImages.Designer.cs`
- `ProductCompare.Admin/src/components/products/ProductImagesEditor.tsx`
- `ProductCompare.Web/src/components/product/ProductGallery.tsx`
- `ProductCompare.Admin/tests/product-images.spec.ts`
- `ProductCompare.Admin/tests/product-gallery.spec.ts`
- `tests/ProductCompare.ImageChecks/ProductCompare.ImageChecks.csproj`
- `tests/ProductCompare.ImageChecks/Program.cs`
- `docs/product-images.md`

Önceki görevlerden kalan değişiklikler bu listeye dahil değildir. `appsettings.Development.json` içindeki kullanıcı değişikliklerine dokunulmadı.
