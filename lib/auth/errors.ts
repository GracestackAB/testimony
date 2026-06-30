import type { Locale } from "@/lib/i18n/types";

const SV: Record<string, string> = {
  invalid_login: "Fel e-post eller lösenord. Kontrollera uppgifterna eller skapa konto.",
  already_registered: "E-postadressen är redan registrerad. Logga in i stället.",
  password_short: "Lösenordet måste vara minst 8 tecken.",
  email_not_confirmed: "Bekräfta din e-post först — kolla inkorgen efter vårt bekräftelsemail.",
  signup_disabled: "Registrering är tillfälligt avstängd. Kontakta oss om du behöver hjälp.",
  rate_limit: "För många försök. Vänta en stund och försök igen.",
  invalid_email: "Ogiltig e-postadress.",
  oauth_failed: "Google-inloggning misslyckades. Prova e-post + lösenord, eller kontakta support.",
  oauth_server: "Inloggningstjänsten svarade inte korrekt. Försök igen om en stund.",
};

const EN: Record<string, string> = {
  invalid_login: "Wrong email or password. Check your details or create an account.",
  already_registered: "This email is already registered. Sign in instead.",
  password_short: "Password must be at least 8 characters.",
  email_not_confirmed: "Confirm your email first — check your inbox for our confirmation message.",
  signup_disabled: "Registration is temporarily disabled. Contact us if you need help.",
  rate_limit: "Too many attempts. Wait a moment and try again.",
  invalid_email: "Invalid email address.",
  oauth_failed: "Google sign-in failed. Try email + password, or contact support.",
  oauth_server: "The sign-in service did not respond correctly. Try again shortly.",
};

/** Översätter vanliga Supabase Auth-fel. */
export function authErrorMessage(message: string, locale: Locale = "sv"): string {
  const m = message.toLowerCase();
  const dict = locale === "en" ? EN : SV;
  if (m.includes("invalid login credentials")) return dict.invalid_login;
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return dict.already_registered;
  }
  if (m.includes("password should be at least")) return dict.password_short;
  if (m.includes("email not confirmed")) return dict.email_not_confirmed;
  if (m.includes("signup is disabled")) return dict.signup_disabled;
  if (m.includes("rate limit")) return dict.rate_limit;
  if (m.includes("email address") && m.includes("invalid")) return dict.invalid_email;
  if (m.includes("invalid_client") || m.includes("server_error") || m.includes("unable to exchange")) {
    return dict.oauth_failed;
  }
  if (m.includes("oauth") && m.includes("error")) return dict.oauth_failed;
  return message;
}
