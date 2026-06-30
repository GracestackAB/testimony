import type {
  Denomination,
  FieldVisibility,
  FieldVisibilityKey,
  ProfileVisibility,
  RoleInChurch,
} from "./constants";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  church: string | null;
  church_id: string | null;
  denomination: Denomination | null;
  role_in_church: RoleInChurch | null;
  believer_since: string | null; // ISO date
  favorite_verse: string | null;
  headline: string | null;
  ministry_focus: string | null;
  open_to_connect: boolean;
  open_to_serve: boolean;
  preferred_locale: "sv" | "en";
  is_moderator: boolean;
  is_org_admin: boolean;
  profile_visibility: ProfileVisibility;
  field_visibility: Record<FieldVisibilityKey, FieldVisibility>;
  consent_special_category_at: string | null;
  consent_special_category_version: string | null;
  onboarding_completed: boolean;
  username_changed_at: string | null;
  last_active_at: string | null;
  deleted_at: string | null;
  is_anonymized: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  church: string | null;
  denomination: string | null;
  role_in_church: string | null;
  ministry_focus: string | null;
  open_to_connect: boolean;
  open_to_serve: boolean;
  favorite_verse: string | null;
  created_at: string;
  is_anonymized: boolean;
};

export type ContributionStub = {
  id: string;
  status: string;
  created_at: string;
  is_anonymous?: boolean;
};

export type Contributions = {
  testimonies: (ContributionStub & { slug: string; title: string; published_at: string | null })[];
  prayer_requests: (ContributionStub & { title: string | null; is_answered: boolean })[];
  prayer_answers: (ContributionStub & { request_id: string | null })[];
  gratitudes: ContributionStub[];
};

export type UsernameAvailability =
  | { available: true }
  | { available: false; reason: "invalid_format" | "reserved" | "taken" | "recently_used" | "cooldown" };
