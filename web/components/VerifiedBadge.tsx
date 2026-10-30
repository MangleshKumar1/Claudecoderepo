import type { Profile } from "@/lib/types";

export default function VerifiedBadge({ profile }: { profile: Pick<Profile, "phone_verified" | "email_verified"> }) {
  return (
    <span className="badges">
      {profile.phone_verified && <span className="badge good" title="Phone number confirmed">✓ Phone verified</span>}
      {profile.email_verified && <span className="badge" title="Email confirmed">✓ Email verified</span>}
      {!profile.phone_verified && !profile.email_verified && <span className="badge warn">Not verified</span>}
    </span>
  );
}
