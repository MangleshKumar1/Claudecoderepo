import { isConfigured } from "@/lib/supabase";

export default function SetupBanner() {
  if (isConfigured) return null;
  return (
    <div className="banner">
      Demo mode: showing sample data. Add your Supabase keys to enable accounts, posts and trips (see the README, Step 1 and Step 5).
    </div>
  );
}
