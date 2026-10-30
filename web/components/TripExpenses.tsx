"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { addExpense, deleteExpense, listExpenses } from "@/lib/data";
import { balances, settlements, type Person } from "@/lib/split";
import { EXPENSE_CATEGORIES, type ExpenseCategory, type TripExpense } from "@/lib/types";

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function TripExpenses({ tripId, me, people, isOwner }: {
  tripId: string; me: string; people: Person[]; isOwner: boolean;
}) {
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listExpenses(tripId).then(setExpenses).catch((e) => setError(e.message));
  }, [tripId]);
  useEffect(() => { load(); }, [load]);

  const name = (id: string) => (id === me ? "You" : people.find((p) => p.id === id)?.name ?? "Traveller");
  const net = useMemo(() => balances(expenses, people), [expenses, people]);
  const payments = useMemo(() => settlements(net), [net]);
  const total = expenses.reduce((a, e) => a + e.amount, 0);
  const mine = net.get(me) ?? 0;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setBusy(true);
    setError(null);
    try {
      await addExpense({
        trip_id: tripId, amount: Number(f.get("amount")),
        description: (f.get("description") as string).trim(), category: f.get("category") as ExpenseCategory,
      });
      form.reset();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add expense");
    }
    setBusy(false);
  }

  return (
    <>
      <h2>Expenses</h2>
      <p className="muted">
        Add what you paid for. Everything is split equally among all {people.length} travellers on this trip.
        This tracks who owes whom. It doesn't move money.
      </p>
      {expenses.length > 0 && (
        <p>
          <strong>Total {inr(total)}</strong> · about {inr(Math.round((total / Math.max(1, people.length)) * 100) / 100)} each
          {" · "}
          {mine === 0 ? <span className="ok">you're all square</span>
            : mine > 0 ? <span className="ok">you're owed {inr(mine / 100)}</span>
            : <span className="error">you owe {inr(-mine / 100)}</span>}
        </p>
      )}

      {payments.length > 0 && (
        <div className="review">
          <strong>Settle up</strong>
          {payments.map((p, i) => (
            <p key={i} style={{ margin: "4px 0" }}>{name(p.from)} → {name(p.to)}: <strong>{inr(p.amount)}</strong></p>
          ))}
        </div>
      )}

      {expenses.map((x) => (
        <div key={x.id} className="review">
          <strong>{inr(x.amount)}</strong> · {x.description} <span className="tag">{x.category}</span>
          <br /><small className="muted">paid by {name(x.paid_by)} · {new Date(x.created_at).toLocaleDateString()}</small>
          {(x.paid_by === me || isOwner) && (
            <> <button className="link error" disabled={busy} onClick={() => { setBusy(true); deleteExpense(x.id).then(load).catch((e) => setError(e.message)).finally(() => setBusy(false)); }}>delete</button></>
          )}
        </div>
      ))}

      <details className="tips"><summary>+ Add an expense</summary>
        <form className="stack" onSubmit={submit}>
          <div className="row">
            <label>Amount (₹)<input name="amount" type="number" min={1} step="0.01" required /></label>
            <label>Category<select name="category" defaultValue="food">{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          </div>
          <label>What was it for?<input name="description" required maxLength={120} placeholder="Petrol, dinner at Mall Road…" /></label>
          <button className="primary" disabled={busy}>Add expense</button>
        </form>
      </details>
      {error && <p className="error">{error}</p>}
    </>
  );
}
