const profileKey = "gym4me.onboarding.profile";

export type OnboardingProfile = {
  name: string;
  bio: string;
  photo: string;
};

export function readOnboardingProfile(): OnboardingProfile | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(profileKey) ?? "null");
    if (
      value &&
      typeof value === "object" &&
      "name" in value &&
      typeof value.name === "string" &&
      "bio" in value &&
      typeof value.bio === "string" &&
      "photo" in value &&
      typeof value.photo === "string"
    ) {
      return { name: value.name, bio: value.bio, photo: value.photo };
    }
  } catch {
    // The form is still usable when storage is unavailable.
  }
  return null;
}

export function saveOnboardingProfile(profile: OnboardingProfile) {
  localStorage.setItem(profileKey, JSON.stringify(profile));
}
