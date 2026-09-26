# Authentication setup

The API uses signed HS256 access JWTs and cryptographically random opaque refresh tokens. Only SHA-256 refresh hashes are persisted. Both credentials are HttpOnly cookies; JSON contains only user metadata. Public registration creates active User accounts. There is no password reset, email verification or role-assignment endpoint.

## Required operator steps

Run from the repository root in PowerShell. Supply a signing key before starting the API. Generate it once and retain it in your secret store; generating a different key invalidates existing access tokens.

```powershell
$env:Jwt__SigningKey = python -c "import secrets; print(secrets.token_urlsafe(48))"
$env:ASPNETCORE_ENVIRONMENT = 'Development'
dotnet tool restore
dotnet ef database update --project ProductCompare.Api

dotnet run --project ProductCompare.Api
```

Migration `20260925221035_AddAuthentication` adds `Users` and `RefreshTokens`; it does not recreate the database or alter catalog data. This implementation has not applied it to your application's schema. Tests apply migrations only inside disposable, randomly named test schemas.

Editor seeding has been removed. Register through `/login`, then promote the account manually using the SQL below. Existing catalog seeding remains unchanged; no existing account is modified.

Start the existing frontends with `npm run dev` in their respective directories. Public login is `/login`; the admin app displays a login screen before its editor routes. Users without the Editor role cannot enter the admin screens.

## Configuration

| Variable | Purpose / default |
| --- | --- |
| `Jwt__SigningKey` | Required secret; at least 32 UTF-8 bytes, use a strong random value |
| `Jwt__Issuer` | `ProductCompare.Api` |
| `Jwt__Audience` | `ProductCompare` |
| `Jwt__AccessTokenMinutes` | `15` (allowed 1–60) |
| `Jwt__RefreshTokenDays` | `7` (allowed 1–90) |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection; configure production credentials |
| `Cors__AllowedOrigins__0`, `__1`, etc. | Exact frontend origins, no trailing slash or wildcard |
| `AuthCookies__Secure` | `true`; Development overrides to `false` for local HTTP |
| `AuthCookies__SameSite` | `Lax`; use `None` with Secure for genuinely cross-site deployments |
| `NEXT_PUBLIC_API_BASE_URL` | Browser-reachable API origin for Next.js, configured at build time |
| `VITE_API_BASE_URL` | Browser-reachable API origin for the admin app, configured at build time |

Development CORS allows `http://localhost:3000` and `http://localhost:5173`, including credentials. Production origins default to an empty list; explicitly configure your actual HTTPS web and admin origins. For local HTTPS, configure the corresponding HTTPS origins and Secure cookies. Use the same hostname consistently; `localhost` and `127.0.0.1` have different cookie scopes.

Production startup rejects insecure cookies, insecure allowed origins, and invalid JWT settings. Serve the API over HTTPS. Persist and share ASP.NET Core Data Protection keys across API instances/restarts so antiforgery cookies remain valid. Cross-site browser cookie restrictions can still prevent third-party cookies; same-site frontend/API deployment is preferred.

## Endpoints and cookies

| Endpoint | Behavior |
| --- | --- |
| `GET /api/auth/csrf` | Returns an antiforgery request token and sets its HttpOnly companion cookie; no authentication required |
| `POST /api/auth/register` | `{email,password,confirmPassword}`; creates an active User and signs in; duplicate email returns 409 |
| `POST /api/auth/login` | `{email,password}`; generic 401 failure; successful `{user:{id,email,role}}` |
| `POST /api/auth/refresh` | Reads only refresh cookie, rotates once, replaces both cookies; safe user metadata response |
| `POST /api/auth/logout` | Revokes current refresh token and deletes auth cookies; 204, including when cookies are absent |
| `GET /api/auth/me` | Requires valid access cookie; returns `{id,email,role}` |

All auth responses are non-cacheable. `pc_access` uses Path `/api`, with a 15-minute default expiry. `pc_refresh` uses Path `/api/auth`, with a 7-day default expiry. Both are host-only, HttpOnly, SameSite=Lax by default and Secure in production. `pc_csrf` is a separate HttpOnly antiforgery companion cookie scoped to `/api`; the CSRF request token is safe for JavaScript to read and is not an authentication credential.

Every unsafe `/api` request requires `X-CSRF-TOKEN`. Fetch a fresh token from `/api/auth/csrf` with cookies before the mutation, including registration, login, refresh and logout. The clients do this automatically, avoiding stale antiforgery identity after login or access expiration. Multipart image uploads use the same header. The backend uses ASP.NET Core antiforgery validation in addition to SameSite and explicit credentialed CORS.

The Next.js public catalog remains server-rendered using its existing server-only fetch module. Browser authentication uses fetch in `src/lib/api/auth.ts`; it cannot use the server-only catalog module. The admin uses its existing Axios client. Both include cookies, share an in-flight refresh promise, retry the original request once and exclude registration/login/refresh/logout from refresh loops. React stores safe user metadata only; neither frontend reads or stores either credential.

Editor authorization covers every existing POST/PUT/DELETE for products and product images, brands, categories and category-attribute assignment, attribute definitions, plus `/api/admin/search/reindex` and `/api/admin/search/migrate-index`. Public catalog GETs, search, compare and images remain public. The API rechecks the active user and current role during JWT authentication, so deactivation or role changes invalidate old access JWTs immediately.

Refresh rotation takes a PostgreSQL row lock and commits revocation and replacement together. Only one concurrent refresh can succeed. Reusing a revoked token is rejected; token-family revocation is not implemented. Logout revokes the presented refresh token, but a previously copied access JWT remains valid until its short expiry unless the user is deactivated or their role changes.

## Verification

```powershell
dotnet build ProductCompare.Api -c Release
npm --prefix ProductCompare.Web run build
npm --prefix ProductCompare.Admin run build
dotnet run --project tests/ProductCompare.ImageChecks -c Release

# Use a test PostgreSQL database permitting CREATE/DROP SCHEMA.
$env:AUTH_TEST_CONNECTION = '<test PostgreSQL connection string>'
dotnet run --project tests/ProductCompare.ContentChecks -c Release

# Existing live browser tests require the migrated API and an Editor:
$env:E2E_EDITOR_EMAIL = '<development Editor email>'
$env:E2E_EDITOR_PASSWORD = '<development Editor password>'
npm --prefix ProductCompare.Admin run test:e2e
```

The content-check project includes auth HTTP integration checks without adding a new test framework. It creates and removes only its own random PostgreSQL schema. Without `AUTH_TEST_CONNECTION`, it reports that auth integration checks were not run. Live Editor browser checks explicitly skip without the two E2E credentials. Mocked auth/editor/image browser checks require the Vite dev server but no Editor credentials. Other existing browser checks still require the project's expected catalog fixtures, Elasticsearch and public frontend.

## File inventory

Created: API `Enums/UserRole.cs`, `Entities/User.cs`, `Entities/RefreshToken.cs`, `Services/JwtOptions.cs`, `Services/TokenService.cs`, `Services/AuthService.cs`, `Services/AuthenticationSetup.cs`, `Controllers/AuthController.cs`, and the AddAuthentication migration/designer; Web `src/lib/api/auth.ts`, `src/components/auth/{AuthProvider,AccountLink}.tsx`, `src/app/login/page.tsx`; Admin `src/auth/AuthProvider.tsx`, `tests/auth.spec.ts`, `tests/auth-fixture.ts`; `tests/ProductCompare.ContentChecks/AuthChecks.cs`; this guide.

Modified: API project dependencies, Program, AppDbContext, SeedData, both appsettings files, model snapshot, and mutation authorization in Products/Categories/Brands/Attributes/AdminSearch controllers; Web layout and Header; Admin App and apiClient; existing browser fixtures in catalog/editorial-live/category/editorial/product-images tests; content-check Program. Catalog services and Elasticsearch implementation are unchanged.

## Results from this implementation

- API Release build, Next.js production build and admin production build passed. The admin build reports its existing large-bundle warning.
- Content/sanitization checks, image checks, and PostgreSQL auth integration checks passed, including actual HTTP authorization, tampered and expired JWTs, inactive accounts, and simultaneous refresh rotation.
- Both new auth browser tests and the existing mocked editorial, image upload and gallery checks passed.
- Full browser suite: 5 passed, 4 skipped for missing live Editor credentials, 3 failed. One failure captured credentialed CORS errors against the still-running pre-auth API; restart the configured, migrated API before rerunning. The other failures were existing catalog assertions: RAM filter collapse visibility and stale search-result count. These catalog behaviors were not changed in this task, and their baseline was not separately verified.
- The initial Debug build could not replace the running API executable; Release builds succeeded without stopping it.


## Public registration update

`POST /api/auth/register` requires the same CSRF header/cookies as login. First call `GET /api/auth/csrf` and send its `token` as `X-CSRF-TOKEN`, with browser credentials included.

Request:
```json
{"email":"user@example.com","password":"a long example passphrase","confirmPassword":"a long example passphrase"}
```
Response (200; both authentication credentials are set only as HttpOnly cookies):
```json
{"user":{"id":123,"email":"user@example.com","role":"User"}}
```
Passwords must be 8?128 characters; confirmation must match. No character-class requirements are imposed. Email is trimmed/lowercased. Unknown role/permission JSON fields are ignored, and the service explicitly sets `UserRole.User`. New users are immediately active. User and initial refresh-token hash are persisted atomically. The unique email index remains authoritative, and duplicate races return the same friendly 409 response. No schema changes or new migration were required; the existing `usermodel` migration was left untouched.

The `/login` screen offers **Hesap olu?tur** with email, password and password confirmation. Success displays the authenticated account, following the existing login flow.

Manual promotion in PostgreSQL (replace the email with the account you intend to promote):
```sql
UPDATE "Users"
SET "Role" = 1
WHERE "Email" = 'user@example.com'
RETURNING "Id", "Email", "Role";
```
`User = 0`, `Editor = 1`. The stored email is normalized. Sign in again after promotion, or let the existing refresh flow issue an updated access cookie. No public role-update endpoint exists.

Files modified for registration: `ProductCompare.Api/Controllers/AuthController.cs`, `ProductCompare.Api/Services/AuthService.cs`, `ProductCompare.Api/Data/SeedData.cs`, `ProductCompare.Web/src/components/auth/AuthProvider.tsx`, `ProductCompare.Web/src/lib/api/auth.ts`, `ProductCompare.Web/src/app/login/page.tsx`, `tests/ProductCompare.ContentChecks/AuthChecks.cs`, and this guide. Created: `ProductCompare.Admin/tests/registration.spec.ts`. Registration tests extend the existing PostgreSQL auth checks and browser suite.

Registration update verification: API Release and public frontend production builds passed. PostgreSQL registration and existing auth integration checks passed. Both existing auth browser tests and the new public registration browser test passed. No migration or changes to the application's database were performed for this update.
