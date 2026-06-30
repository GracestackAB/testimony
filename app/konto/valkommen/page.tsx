import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile/server";
import { OnboardingWizard } from "./OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login?next=/konto/valkommen");
  if (profile.onboarding_completed) redirect("/konto");
  return <OnboardingWizard profile={profile} />;
}
