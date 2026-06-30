# Google OAuth — redirect_uri_mismatch + invalid_client

## Rotorsak (2026-06-23)

GoTrue behöver **Client secret** i klartext från Google Cloud (`GOCSPX-...`).
Supabase Management API returnerar **inte** samma värde — synk därifrån ger `invalid_client`.

## Fix (5 min)

### 1. Redirect URI (om `redirect_uri_mismatch`)

[OAuth-klienten i GCP](https://console.cloud.google.com/apis/credentials/oauthclient/819989401709-hsmg57adbo0f6ctimjsphtrjkte7mnm1.apps.googleusercontent.com?project=emiliocedendahl)

Lägg till under **Authorized redirect URIs**:

```
https://www.testimony.se/auth/v1/callback
```

### 2. Client secret (om du kommer tillbaka utan att vara inloggad)

1. Samma OAuth-sida i GCP → **Client secret**
2. Om du inte ser den: **Reset secret** → kopiera nya värdet (börjar med `GOCSPX-`)
3. Lägg i `.env.local`:

```bash
GOTRUE_EXTERNAL_GOOGLE_CLIENT_SECRET=GOCSPX-din-hemlighet-här
```

4. Kör:

```bash
chmod +x azure/set-google-oauth-secret.sh
source .env.local
./azure/set-google-oauth-secret.sh
```

5. Testa Google-inloggning på [testimony.se/login](https://www.testimony.se/login)

## Tills dess

E-post + lösenord på `/login` fungerar utan Google.
