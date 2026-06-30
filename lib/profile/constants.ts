export const DENOMINATIONS = [
  { value: "pingst", label: "Pingst" },
  { value: "efk", label: "EFK (Evangeliska Frikyrkan)" },
  { value: "svenska_kyrkan", label: "Svenska kyrkan" },
  { value: "katolska", label: "Katolska kyrkan" },
  { value: "equmenia", label: "Equmeniakyrkan" },
  { value: "baptist", label: "Baptist" },
  { value: "fralsningsarmen", label: "Frälsningsarmén" },
  { value: "adventist", label: "Adventist" },
  { value: "ortodox", label: "Ortodox" },
  { value: "fri_oberoende", label: "Fri / oberoende församling" },
  { value: "annan", label: "Annan" },
  { value: "vill_ej_ange", label: "Vill ej ange" },
] as const;

export type Denomination = typeof DENOMINATIONS[number]["value"];

export const ROLES_IN_CHURCH = [
  { value: "medlem", label: "Medlem" },
  { value: "ledare", label: "Ledare" },
  { value: "pastor", label: "Pastor / präst" },
  { value: "ungdomsledare", label: "Ungdomsledare" },
  { value: "volontar", label: "Volontär" },
  { value: "besokare", label: "Besökare" },
  { value: "annan", label: "Annan" },
] as const;

export type RoleInChurch = typeof ROLES_IN_CHURCH[number]["value"];

export const PROFILE_VISIBILITY = [
  { value: "public", label: "Publik", description: "Alla på internet kan se min profil." },
  { value: "members_only", label: "Endast inloggade", description: "Endast inloggade på testimony.se kan se min profil." },
  { value: "private", label: "Privat", description: "Endast jag själv ser min profil." },
] as const;

export type ProfileVisibility = typeof PROFILE_VISIBILITY[number]["value"];

export const FIELD_VISIBILITY_KEYS = [
  "bio",
  "city",
  "church",
  "denomination",
  "role_in_church",
  "believer_since",
  "favorite_verse",
] as const;

export type FieldVisibilityKey = typeof FIELD_VISIBILITY_KEYS[number];
export type FieldVisibility = "public" | "members_only" | "private";

export const FIELD_VISIBILITY_LABELS: Record<FieldVisibilityKey, string> = {
  bio: "Bio",
  city: "Stad",
  church: "Församling",
  denomination: "Samfund",
  role_in_church: "Roll i församlingen",
  believer_since: "Frälsningsdag",
  favorite_verse: "Favoritbibelvers",
};

export const SPECIAL_CATEGORY_FIELDS: FieldVisibilityKey[] = [
  "denomination",
  "role_in_church",
  "believer_since",
  "favorite_verse",
];

export const POLICY_VERSIONS = {
  tos: "v1.0",
  privacy: "v1.0",
  special_category: "v1.0",
  newsletter: "v1.0",
} as const;

export const USERNAME_REGEX = /^[a-z0-9][a-z0-9_-]{2,29}$/;
export const USERNAME_COOLDOWN_DAYS = 30;
export const USERNAME_RESERVE_DAYS = 90;
export const BIO_MAX_LENGTH = 240;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const DEFAULT_FIELD_VISIBILITY: Record<FieldVisibilityKey, FieldVisibility> = {
  bio: "public",
  city: "public",
  church: "public",
  denomination: "members_only",
  role_in_church: "members_only",
  believer_since: "private",
  favorite_verse: "public",
};
