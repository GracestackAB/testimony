export type ContentStatus = "draft" | "pending" | "published" | "rejected" | "archived";
export type TestimonyFormat = "skriven" | "musik" | "video" | "bildberattelse";
export type OrgType =
  | "forsamling"
  | "social"
  | "cafe"
  | "lager"
  | "bibelskola"
  | "boneroerelse"
  | "annat";

export interface Testimony {
  id: string;
  slug: string;
  title: string;
  lede: string | null;
  body: string;
  format: TestimonyFormat;
  cover_image_url: string | null;
  media_embed_url: string | null;
  reading_minutes: number | null;
  author_id: string | null;
  is_anonymous: boolean;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
}

export interface PrayerRequest {
  id: string;
  title: string | null;
  body: string;
  author_id: string | null;
  is_anonymous: boolean;
  is_answered: boolean;
  answered_at: string | null;
  status: ContentStatus;
  created_at: string;
}

export interface PrayerAnswer {
  id: string;
  request_id: string | null;
  body: string;
  author_id: string | null;
  is_anonymous: boolean;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  slug: string;
  name: string;
  type: OrgType;
  city: string | null;
  address: string | null;
  description: string | null;
  about: string | null;
  hero_image_url: string | null;
  website_url: string | null;
  contact_email: string | null;
  is_published: boolean;
  created_at: string;
}

export interface VolunteerOpportunity {
  id: string;
  slug: string;
  organization_id: string | null;
  title: string;
  description: string;
  category: string;
  commitment: string;
  location: string | null;
  skills_required: string | null;
  background_check_required: boolean;
  contact_email: string | null;
  status: string;
  created_at: string;
}
