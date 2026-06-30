import {
  BIO_MAX_LENGTH,
  DENOMINATIONS,
  FIELD_VISIBILITY_KEYS,
  PROFILE_VISIBILITY,
  ROLES_IN_CHURCH,
  USERNAME_REGEX,
  type Denomination,
  type FieldVisibility,
  type FieldVisibilityKey,
  type ProfileVisibility,
  type RoleInChurch,
} from "./constants";

export type ProfileUpdateInput = Partial<{
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  bio: string | null;
  city: string | null;
  username: string | null;
  church: string | null;
  denomination: Denomination | null;
  role_in_church: RoleInChurch | null;
  believer_since: string | null;
  favorite_verse: string | null;
  headline: string | null;
  ministry_focus: string | null;
  open_to_connect: boolean;
  open_to_serve: boolean;
  preferred_locale: "sv" | "en";
}>;

export type ValidationError = { field: string; code: string; message: string };

export function validateProfileUpdate(
  input: unknown,
  hasSpecialConsent: boolean
): { ok: true; data: ProfileUpdateInput } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  const data: ProfileUpdateInput = {};

  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: [{ field: "_root", code: "invalid", message: "Ogiltig data." }] };
  }
  const o = input as Record<string, unknown>;

  function asStr(v: unknown, max?: number): string | null {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    if (max && trimmed.length > max) return trimmed.slice(0, max);
    return trimmed.length === 0 ? null : trimmed;
  }

  if ("first_name" in o) data.first_name = asStr(o.first_name, 80);
  if ("last_name" in o) data.last_name = asStr(o.last_name, 80);
  if ("display_name" in o) data.display_name = asStr(o.display_name, 120);
  if ("city" in o) data.city = asStr(o.city, 80);
  if ("church" in o) data.church = asStr(o.church, 160);
  if ("favorite_verse" in o) data.favorite_verse = asStr(o.favorite_verse, 240);

  if ("headline" in o) {
    const h = asStr(o.headline, 121);
    if (h && h.length > 120) {
      errors.push({ field: "headline", code: "too_long", message: "Max 120 tecken." });
    } else {
      data.headline = h;
    }
  }
  if ("ministry_focus" in o) {
    const m = asStr(o.ministry_focus, 201);
    if (m && m.length > 200) {
      errors.push({ field: "ministry_focus", code: "too_long", message: "Max 200 tecken." });
    } else {
      data.ministry_focus = m;
    }
  }
  if ("open_to_connect" in o) data.open_to_connect = Boolean(o.open_to_connect);
  if ("open_to_serve" in o) data.open_to_serve = Boolean(o.open_to_serve);
  if ("preferred_locale" in o) {
    const v = o.preferred_locale;
    if (v === "sv" || v === "en") data.preferred_locale = v;
  }

  if ("bio" in o) {
    const bio = asStr(o.bio, BIO_MAX_LENGTH + 1);
    if (bio && bio.length > BIO_MAX_LENGTH) {
      errors.push({ field: "bio", code: "too_long", message: `Max ${BIO_MAX_LENGTH} tecken.` });
    } else {
      data.bio = bio;
    }
  }

  if ("username" in o) {
    const u = asStr(o.username);
    if (u === null) {
      data.username = null;
    } else {
      const lower = u.toLowerCase();
      if (!USERNAME_REGEX.test(lower)) {
        errors.push({
          field: "username",
          code: "invalid_format",
          message: "Användarnamnet måste vara 3–30 tecken (a–z, 0–9, _, -) och börja med bokstav/siffra.",
        });
      } else {
        data.username = lower;
      }
    }
  }

  if ("denomination" in o) {
    const v = o.denomination;
    if (v === null || v === "" || v === undefined) {
      data.denomination = null;
    } else if (typeof v === "string" && DENOMINATIONS.some((d) => d.value === v)) {
      if (!hasSpecialConsent) {
        errors.push({ field: "denomination", code: "consent_required", message: "Samtycke krävs för känsliga personuppgifter." });
      } else {
        data.denomination = v as Denomination;
      }
    } else {
      errors.push({ field: "denomination", code: "invalid_value", message: "Okänt samfund." });
    }
  }

  if ("role_in_church" in o) {
    const v = o.role_in_church;
    if (v === null || v === "" || v === undefined) {
      data.role_in_church = null;
    } else if (typeof v === "string" && ROLES_IN_CHURCH.some((r) => r.value === v)) {
      if (!hasSpecialConsent) {
        errors.push({ field: "role_in_church", code: "consent_required", message: "Samtycke krävs." });
      } else {
        data.role_in_church = v as RoleInChurch;
      }
    } else {
      errors.push({ field: "role_in_church", code: "invalid_value", message: "Okänd roll." });
    }
  }

  if ("believer_since" in o) {
    const v = o.believer_since;
    if (v === null || v === "" || v === undefined) {
      data.believer_since = null;
    } else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const date = new Date(v);
      if (Number.isNaN(date.getTime()) || date > new Date()) {
        errors.push({ field: "believer_since", code: "invalid_date", message: "Ogiltigt datum." });
      } else if (!hasSpecialConsent) {
        errors.push({ field: "believer_since", code: "consent_required", message: "Samtycke krävs." });
      } else {
        data.believer_since = v;
      }
    } else {
      errors.push({ field: "believer_since", code: "invalid_date", message: "Ogiltigt datumformat (YYYY-MM-DD)." });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data };
}

export function validateVisibility(
  input: unknown
): { ok: true; profileVisibility?: ProfileVisibility; fieldVisibility?: Record<FieldVisibilityKey, FieldVisibility> } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (typeof input !== "object" || input === null) {
    return { ok: false, errors: [{ field: "_root", code: "invalid", message: "Ogiltig data." }] };
  }
  const o = input as Record<string, unknown>;
  const out: { profileVisibility?: ProfileVisibility; fieldVisibility?: Record<FieldVisibilityKey, FieldVisibility> } = {};

  if ("profile_visibility" in o) {
    const v = o.profile_visibility;
    if (typeof v === "string" && PROFILE_VISIBILITY.some((p) => p.value === v)) {
      out.profileVisibility = v as ProfileVisibility;
    } else {
      errors.push({ field: "profile_visibility", code: "invalid_value", message: "Ogiltigt synlighetsval." });
    }
  }

  if ("field_visibility" in o) {
    const fv = o.field_visibility;
    if (typeof fv !== "object" || fv === null) {
      errors.push({ field: "field_visibility", code: "invalid", message: "Ogiltigt fältobjekt." });
    } else {
      const result: Partial<Record<FieldVisibilityKey, FieldVisibility>> = {};
      for (const key of FIELD_VISIBILITY_KEYS) {
        const val = (fv as Record<string, unknown>)[key];
        if (val === undefined) continue;
        if (val === "public" || val === "members_only" || val === "private") {
          result[key] = val;
        } else {
          errors.push({ field: `field_visibility.${key}`, code: "invalid_value", message: "Ogiltigt värde." });
        }
      }
      out.fieldVisibility = result as Record<FieldVisibilityKey, FieldVisibility>;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, ...out };
}
