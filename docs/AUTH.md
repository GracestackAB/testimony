# Autentisering (Supabase)

## Rekommenderat flöde: e-post + lösenord

1. Användaren går till **`/registrera`**
2. Fyller i e-post + lösenord (minst 8 tecken)
3. Om e-postbekräftelse är på i Supabase → bekräftelsemail → klick → inloggad
4. Vidare till **`/konto/valkommen`** (onboarding)

Inloggning: **`/login`** → fliken "Lösenord".

## Supabase Dashboard — obligatoriska inställningar

### Authentication → Providers

| Provider | Inställning |
|----------|-------------|
| **Email** | Enabled |
| Confirm email | Av för snabb onboarding ELLER på för säkerhet (rekommenderat prod) |
| **Google** | Enabled endast om OAuth är korrekt konfigurerad |

### Authentication → URL Configuration

| Fält | Värde (prod) |
|------|----------------|
| Site URL | `https://www.testimony.se` |
| Redirect URLs | `https://www.testimony.se/auth/callback`, `https://testimony.se/auth/callback`, `http://localhost:3005/auth/callback` |

### Google OAuth (self-hosted GoTrue på Azure)

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 Client
2. **Authorized redirect URI** (exakt, lägg till i GCP-projekt **emiliocedendahl**):
   `https://www.testimony.se/auth/v1/callback`
   (Next.js proxar `/auth/v1/*` till API-gateway. Behåll ev. även Supabase Cloud-URI om den fanns tidigare.)
3. GoTrue env: `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`, `GOTRUE_EXTERNAL_GOOGLE_SECRET`, **`GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI`** = samma URI som ovan
4. Snabbguide: `scripts/google-oauth-fix.md` · [direktlänk OAuth-klient](https://console.cloud.google.com/apis/credentials/oauthclient/819989401709-hsmg57adbo0f6ctimjsphtrjkte7mnm1.apps.googleusercontent.com?project=emiliocedendahl)
4. **Vanliga fel:**
   - `missing redirect URI` → `GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI` saknas
   - `redirect_uri_mismatch` → URI inte tillagd i Google Console
   - Site URL / allow list måste inkludera `https://www.testimony.se/auth/callback`

Google är nedtonat i UI tills detta är verifierat. E-post/lösenord ska alltid fungera.

## Lösenordsåterställning

1. `/login` → "Glömt lösenord?"
2. E-post med länk → `/auth/callback?next=/konto/losenord`
3. Användaren sätter nytt lösenord på `/konto/losenord`

## Magic link

Alternativ på `/login` → fliken "Magisk länk". Inget lösenord krävs.

## Profiler

`auth.users` → trigger `handle_new_user()` → rad i `public.profiles`.

Onboarding: `/konto/valkommen` sätter användarnamn, avatar, samtycken.

## Felsökning

| Symptom | Lösning |
|---------|---------|
| "Invalid login credentials" | Fel lösenord eller konto saknas → `/registrera` |
| "Email not confirmed" | Klicka bekräftelselänk i mail |
| Google redirect loop | Kontrollera Redirect URLs + Google OAuth URI |
| Magic link går till fel domän | Uppdatera Site URL i Supabase |
