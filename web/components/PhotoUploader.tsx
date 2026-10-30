"use client";
import { useRef, useState } from "react";
import { addPlacePhoto } from "@/lib/data";
import { uploadsEnabled } from "@/lib/media";
import { uploadImage } from "@/lib/upload";

export default function PhotoUploader({ placeId, onDone }: { placeId: string; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!uploadsEnabled) return <p className="muted"><small>Photo uploads aren't switched on for this site yet.</small></p>;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4); // up to 4 at a time
    if (files.length === 0) return;
    setBusy(true);
    setError(null);
    let done = 0;
    try {
      for (const file of files) {
        setStatus(`Uploading ${done + 1} of ${files.length}…`);
        const key = await uploadImage(file);
        await addPlacePhoto(placeId, key);
        done++;
      }
      setStatus(`${done} photo${done === 1 ? "" : "s"} added ✓`);
    } catch (err) {
      setStatus(done > 0 ? `${done} added before the problem.` : null);
      setError(err instanceof Error ? err.message : "Upload failed");
    }
    if (input.current) input.current.value = "";
    setBusy(false);
    if (done > 0) onDone();
  }

  return (
    <div>
      <label className="chip" style={{ display: "inline-block", cursor: busy ? "wait" : "pointer" }}>
        {busy ? "Uploading…" : "📷 Add photos"}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/*" multiple hidden disabled={busy} onChange={onPick} />
      </label>
      <small className="muted"> Only add photos you took yourself. Location data is removed from your photos.</small>
      {status && <p className="ok"><small>{status}</small></p>}
      {error && <p className="error"><small>{error}</small></p>}
    </div>
  );
}
