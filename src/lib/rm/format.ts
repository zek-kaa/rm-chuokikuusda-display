export const tzs = (n: number) => `TZS ${Math.round(n || 0).toLocaleString("en-US")}`;

export function normalizeTzPhone(raw: string): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  const p = d.startsWith("0") ? `255${d.slice(1)}` : d.startsWith("255") ? d : d.length === 9 ? `255${d}` : d;
  return /^255[67]\d{8}$/.test(p) ? p : null;
}

export function splitAmount(amount: number, localShare: number) {
  const local = Math.round(amount * localShare) / 100;
  return { local, conference: amount - local };
}

export function receiptSms(name: string, date: string, items: { code: string; amount: number }[], total: number, receipt: string) {
  const lines = items.map((i) => `${i.code}: ${Math.round(i.amount).toLocaleString("en-US")}/=`).join(", ");
  return `Bwana Yesu Asifiwe ${name}, tumepokea matoleo yako tarehe ${date}: ${lines}. Jumla: TZS ${Math.round(total).toLocaleString("en-US")}/=. Risiti Na: ${receipt}. Mungu akubariki.`;
}

export const PAYMENT_METHODS = ["Cash", "M-Pesa", "Mixx by Yas", "Airtel Money", "HaloPesa", "Bank Transfer", "Online Portal"] as const;
export const STAFF_ROLES = ["head_treasurer", "assistant_treasurer", "auditor", "super_admin", "admin"];
export const WRITE_ROLES = ["head_treasurer", "assistant_treasurer", "super_admin", "admin"];
export const HEAD_ROLES = ["head_treasurer", "super_admin"];
