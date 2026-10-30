"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ListingForm from "@/components/ListingForm";
import { createListing } from "@/lib/data";
import { useUser } from "@/lib/useUser";

export default function NewListing() {
  const router = useRouter();
  const { user, loading } = useUser();
  if (!loading && !user) return <p>Please <Link href="/login">log in</Link> to list your business.</p>;
  return (
    <>
      <h1>List your business</h1>
      <p className="muted">Free to list. Travellers will send you enquiries, which you answer from <Link href="/directory/mine">your panel</Link>.</p>
      <ListingForm submitLabel="Publish listing" onSubmit={async (v) => { const id = await createListing(v); router.push(`/directory/${id}`); }} />
    </>
  );
}
