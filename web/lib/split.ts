export type Expense = { id: string; paid_by: string; amount: number };
export type Person = { id: string; name: string | null };
export type Settlement = { from: string; to: string; amount: number };

const toPaise = (n: number) => Math.round(n * 100);

/**
 * Net balance per person in paise, splitting every expense equally among `people`.
 * Positive = others owe this person; negative = this person owes others.
 * Money paid by someone no longer in `people` is ignored (they can't be settled in-app).
 */
export function balances(expenses: Expense[], people: Person[]): Map<string, number> {
  const net = new Map(people.map((p) => [p.id, 0]));
  const n = people.length;
  if (n === 0) return net;
  for (const e of expenses) {
    if (!net.has(e.paid_by)) continue;
    const total = toPaise(e.amount);
    const share = Math.floor(total / n);
    let remainder = total - share * n; // spread leftover paise so the sum stays exact
    net.set(e.paid_by, net.get(e.paid_by)! + total);
    for (const p of people) {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      net.set(p.id, net.get(p.id)! - share - extra);
    }
  }
  return net;
}

/** Fewest-ish payments that settle everyone up (greedy: biggest debtor pays biggest creditor). */
export function settlements(net: Map<string, number>): Settlement[] {
  const debtors = [...net].filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);
  const creditors = [...net].filter(([, v]) => v > 0).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const out: Settlement[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].v, creditors[j].v);
    if (pay > 0) out.push({ from: debtors[i].id, to: creditors[j].id, amount: pay / 100 });
    debtors[i].v -= pay;
    creditors[j].v -= pay;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}
