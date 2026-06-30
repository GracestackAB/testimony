-- GoTrue v2.170 kan inte läsa auth.sessions med oauth_client_id m.fl. (SELECT * → 500 på refresh).
-- Kolumnerna lades till av nyare auth-schema; tas bort tills GoTrue uppgraderas med matchande migreringar.
-- Reason: session refresh måste fungera för SSR (konto, admin-meny).

ALTER TABLE auth.sessions DROP CONSTRAINT IF EXISTS sessions_oauth_client_id_fkey;
DROP INDEX IF EXISTS auth.sessions_oauth_client_id_idx;

ALTER TABLE auth.sessions
  DROP COLUMN IF EXISTS oauth_client_id,
  DROP COLUMN IF EXISTS scopes,
  DROP COLUMN IF EXISTS refresh_token_hmac_key,
  DROP COLUMN IF EXISTS refresh_token_counter;
