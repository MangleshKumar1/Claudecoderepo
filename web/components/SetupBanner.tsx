import { isConfigured } from "@/lib/supabase";

export default function SetupBanner() {
  if (isConfigured) return null;
  return (
    <div className="banner">
      Demo mode: showing sample data. Copy <code>.env.example</code> to <code>.env.local</code> and
      add your Supabase keys to enable accounts, pins and reviews (see web/README.md).
    </div>
  );
}
