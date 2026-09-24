# Ürün editoryal içeriği

Ürün oluşturma ve düzenleme formunda TipTap görsel editörü, dinamik Artıları ve Eksileri alanları bulunur. HTML kaynak kodu girişi gerekmez. Web ürün detayında içerik ve ardından mobilde alt alta gelen Artılar/Eksiler kartları gösterilir. Mevcut düz metin açıklaması korunur.

## Veri modeli ve API

- `ProductContent`: `ProductId` ortak birincil/yabancı anahtarıyla Product'a bire bir bağlıdır. Ürün silinince içerik de silinir.
- `ContentHtml`: PostgreSQL `text`; `Pros` ve `Cons`: PostgreSQL `text[]`.
- `CreateProductRequest`, bundan türeyen `UpdateProductRequest` ve detay için `ProductDetailResponse` kullanılır. `ProductResponse` listeleme/arama için editoryal alanları içermez; bu sorgular `ProductContent` yüklemez.
- Mevcut create/update ve ID/slug detay endpoint'leri `contentHtml`, `pros`, `cons` alanlarını taşır. Alanlar eski istemciler tarafından gönderilmezse mevcut içerik korunur. Boş string veya boş dizi ilgili alanı temizler.
- Backend HTML'i izin verilen etiketlerle sanitize eder. Yalnızca `href` ve `title` attribute'ları; HTTP, HTTPS ve mailto URL şemaları kabul edilir. Script, iframe, event handler, style ve diğer izin verilmeyen içerikler kaldırılır.
- Boş Artı/Eksi satırları kaldırılır, metinlerin başındaki/sonundaki boşluklar temizlenir; sıra korunur. Bu metinler HTML olarak render edilmez.
- Attribute, filtre, karşılaştırma ve Elasticsearch index yapıları değiştirilmedi.

## Paketler

- Admin: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` — 3.31.3.
- API: `HtmlSanitizer` — 9.2.1039 (AngleSharp bağımlılıklarıyla).
- Kontrol projesi: API sürümüyle eşleşmesi için `Microsoft.EntityFrameworkCore.Relational` — 10.0.12.
- Admin'deki mevcut Lucide ikonları kullanılır; Web'de küçük inline SVG ikonları vardır.

## Migration

`20260924115358_AddProductEditorialContent`, yalnızca `ProductContents` tablosunu oluşturur. İlk teslimde uygulanmadı; 24 Eylül 2026 hata incelemesinde kullanıcının açık onayıyla yerel veritabanına uygulandı ve API güncel Release derlemesiyle Development ortamında yeniden başlatıldı. Başka bir ortamda yeni API'yi kullanmadan önce proje kökünde çalıştırın:

```powershell
dotnet ef database update --project ProductCompare.Api --configuration Release
```

Ardından API'yi yeniden başlatın. Bağlantı ayarı mevcut `ConnectionStrings:DefaultConnection` yapılandırmasından alınır.

## Değiştirilen / eklenen dosyalar

API:
- `ProductCompare.Api/Entities/ProductContent.cs` (yeni)
- `ProductCompare.Api/Entities/Product.cs`
- `ProductCompare.Api/Data/AppDbContext.cs`
- `ProductCompare.Api/DTOs/Products/CreateProductRequest.cs`
- `ProductCompare.Api/DTOs/Products/ProductResponse.cs`
- `ProductCompare.Api/Services/ProductContentSanitizer.cs` (yeni)
- `ProductCompare.Api/Services/ProductService.cs`
- `ProductCompare.Api/ProductCompare.Api.csproj`
- `ProductCompare.Api/Migrations/20260924115358_AddProductEditorialContent.cs` (yeni)
- `ProductCompare.Api/Migrations/20260924115358_AddProductEditorialContent.Designer.cs` (yeni)
- `ProductCompare.Api/Migrations/AppDbContextModelSnapshot.cs`

Admin:
- `ProductCompare.Admin/src/components/products/RichTextEditor.tsx` (yeni)
- `ProductCompare.Admin/src/components/products/ProductPointsEditor.tsx` (yeni)
- `ProductCompare.Admin/src/pages/Products/ProductEditor.tsx`
- `ProductCompare.Admin/src/types/catalog.ts`
- `ProductCompare.Admin/src/index.css`
- `ProductCompare.Admin/package.json`
- `ProductCompare.Admin/package-lock.json`

Web:
- `ProductCompare.Web/src/components/product/ProductRichContent.tsx` (yeni)
- `ProductCompare.Web/src/components/product/ProductProsCons.tsx` (yeni)
- `ProductCompare.Web/src/app/urun/[slug]/page.tsx`
- `ProductCompare.Web/src/types/catalog.ts`
- `ProductCompare.Web/src/app/globals.css`

Kontroller ve dokümantasyon:
- `ProductCompare.Admin/tests/editorial.spec.ts` (yeni)
- `tests/ProductCompare.ContentChecks/ProductCompare.ContentChecks.csproj` (yeni)
- `tests/ProductCompare.ContentChecks/Program.cs` (yeni)
- `docs/product-editorial-content.md` (bu dosya)

## Kontrolleri tekrar çalıştırma

```powershell
dotnet run --project tests/ProductCompare.ContentChecks --configuration Release
cd ProductCompare.Admin
npm run build
npx playwright test tests/editorial.spec.ts
cd ../ProductCompare.Web
npm run typecheck
npm run build
```

`editorial.spec.ts` localhost:5173 üzerinde çalışan Admin'i kullanır, API yanıtlarını taklit eder; gerçek veritabanını değiştirmez. Editör yükleme, başlık biçimlendirme, satır ekleme/silme, kaydetme, tekrar yükleme, boş oluşturma formu ve mobil yatay taşma kontrollerini yapar. .NET kontrolü güvenli biçimlendirme, zararlı HTML, boş değerler ve EF modelini veritabanına bağlanmadan doğrular.

`npx playwright test tests/editorial-live.spec.ts` gerçek API/PostgreSQL, Admin (5173) ve Web (3000) üzerinden geçici bir ürünle kayıt/okuma, ID/slug detay response'u, liste response'undan editoryal alanların çıkarılması, rich text, masaüstü/mobil kartlar, tek taraflı/boş içerik ve teknik özellikleri kontrol eder. Test kendi ürününü sonunda siler. Migration ve API yeniden başlatıldıktan sonra bu test başarıyla çalıştırıldı.

## Samsung görünürlük sorununun nedeni

Çalışan eski API yeni alanları tanımıyordu; `ProductContents` tablosu ve ilgili migration veritabanında yoktu. Eski API, Admin'in gönderdiği editoryal alanları yok sayıp başarılı yanıt veriyordu. Kaynak kodda mapping, Web modeli ve render component'leri mevcuttu. Migration'ın uygulanması ve güncel API'nin başlatılması veri akışını düzeltti. Samsung'un önceden gönderilen editoryal içeriği hiç kaydedilmediği için yeniden girilmeli/kaydedilmelidir.

Gerçek `GET /api/products/by-slug/samsung-galaxy-s25-ultra-512-gb` yanıtındaki alanlar:

```json
{"id":21,"contentHtml":"","pros":[],"cons":[]}
```

Bu düzeltmede değişen dosyalar:
- `ProductCompare.Api/DTOs/Products/ProductResponse.cs`
- `ProductCompare.Api/Services/ProductService.cs`
- `ProductCompare.Admin/src/api/productsApi.ts`
- `ProductCompare.Admin/src/types/catalog.ts`
- `ProductCompare.Admin/src/pages/Products/ProductEditor.tsx` (yalnızca detay tipi)
- `ProductCompare.Web/src/types/catalog.ts`
- `ProductCompare.Web/src/lib/api/catalog.ts`
- `ProductCompare.Web/src/components/product/ProductRichContent.tsx` (boş/null desteği)
- `ProductCompare.Web/src/components/product/ProductProsCons.tsx` (null desteği)
- `ProductCompare.Admin/tests/editorial-live.spec.ts` (yeni gerçek entegrasyon testi)
- `docs/product-editorial-content.md`

Başvurulan resmi belgeler: [TipTap React](https://tiptap.dev/docs/editor/getting-started/install/react), [StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit), [HtmlSanitizer](https://github.com/mganss/HtmlSanitizer).
