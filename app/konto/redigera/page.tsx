import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile/server";
import { EditProfileForm } from "./EditProfileForm";

export const dynamic = "force-dynamic";

export default async function EditProfilePage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login?next=/konto/redigera");
  return <EditProfileForm profile={profile} />;
}
