"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { listMessages, sendMessage, subscribeToMessages } from "@/lib/data";
import Link from "next/link";
import ReportButton from "./ReportButton";
import type { TripMessage } from "@/lib/types";

export default function TripChat({ tripId, userId }: { tripId: string; userId: string }) {
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    listMessages(tripId).then(setMessages).catch((e) => setError(e.message));
  }, [tripId]);

  useEffect(() => {
    refresh();
    const off = subscribeToMessages(tripId, refresh);
    const poll = setInterval(refresh, 20_000); // fallback if realtime isn't enabled
    return () => { off(); clearInterval(poll); };
  }, [tripId, refresh]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    try {
      await sendMessage(tripId, body);
      refresh();
    } catch (err) {
      setText(body);
      setError(err instanceof Error ? err.message : "Could not send");
    }
  }

  return (
    <div className="chat">
      <div className="chatLog">
        {messages.length === 0 && <p className="muted">No messages yet. Say hi 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.user_id === userId ? "me" : ""}`}>
            <small>{m.user_id === userId ? "You" : <Link href={`/profile/${m.user_id}`}>{m.author ?? "Traveller"}</Link>} · {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
            <div>{m.body}</div>
            {m.user_id !== userId && <ReportButton targetUserId={m.user_id} tripId={tripId} messageId={m.id} />}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="chatForm">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the group…" maxLength={2000} />
        <button className="primary">Send</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
