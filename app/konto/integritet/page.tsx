import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile/server";
import { PrivacySettings } from "./PrivacySettings";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login?next=/konto/integritet");
  return <PrivacySettings profile={profile} />;
}
