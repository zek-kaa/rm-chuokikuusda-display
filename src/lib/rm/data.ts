import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";

export const db = () => getSupabaseClient();

export type Category = { id: string; name: string; code: string; description: string | null; local_church_share: number; conference_share: number; is_active: boolean };
export type TxRow = {
  id: string; receipt_number: string; total_amount: number; payment_method: string; transaction_date: string;
  status: string; sms_status: string; void_reason: string | null; recorded_by: string | null; notes: string | null;
  members: { full_name: string; phone_number: string; member_code: string } | null;
  transaction_items: { amount: number; local_church_amount: number; conference_amount: number; category_id: string; offering_categories: { name: string; code: string } | null }[];
};

export function useStaffRoles() {
  return useQuery({
    queryKey: ["rm-roles"],
    queryFn: async () => {
      const { data: u } = await db().auth.getUser();
      if (!u.user) return { userId: null as string | null, roles: [] as string[] };
      const { data } = await db().from("user_roles").select("role").eq("user_id", u.user.id);
      return { userId: u.user.id, roles: (data ?? []).map((r) => r.role as string) };
    },
  });
}

export function perms(roles: string[]) {
  const head = roles.some((r) => r === "head_treasurer" || r === "super_admin");
  const write = head || roles.some((r) => r === "assistant_treasurer" || r === "admin");
  const staff = write || roles.includes("auditor");
  return { head, write, staff };
}

export function useCategories(activeOnly = false) {
  return useQuery({
    queryKey: ["rm-categories", activeOnly],
    queryFn: async () => {
      let q = db().from("offering_categories").select("*").order("created_at");
      if (activeOnly) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

export const TX_SELECT = "id, receipt_number, total_amount, payment_method, transaction_date, status, sms_status, void_reason, recorded_by, notes, members(full_name, phone_number, member_code), transaction_items(amount, local_church_amount, conference_amount, category_id, offering_categories(name, code))";

export function useTransactions(from: string, to: string) {
  return useQuery({
    queryKey: ["rm-tx", from, to],
    queryFn: async () => {
      const { data, error } = await db().from("transactions").select(TX_SELECT)
        .gte("transaction_date", from).lte("transaction_date", to)
        .order("created_at", { ascending: false }).limit(5000);
      if (error) throw error;
      return (data ?? []) as unknown as TxRow[];
    },
  });
}

export async function accessToken() {
  const { data } = await db().auth.getSession();
  return data.session?.access_token ?? "";
}

export const today = () => new Date().toISOString().slice(0, 10);
export function rangeFor(key: string): [string, string] {
  const d = new Date(); const t = today();
  if (key === "today") return [t, t];
  if (key === "7d") { d.setDate(d.getDate() - 6); return [d.toISOString().slice(0, 10), t]; }
  if (key === "month") return [`${t.slice(0, 7)}-01`, t];
  return [`${t.slice(0, 4)}-01-01`, t];
}
