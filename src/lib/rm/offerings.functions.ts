import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeTzPhone, receiptSms } from "./format";

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function sendReceipt(txId: string) {
  const db = await admin();
  const { data: tx } = await db.from("transactions")
    .select("id, receipt_number, total_amount, transaction_date, members(full_name, phone_number), transaction_items(amount, offering_categories(code))")
    .eq("id", txId).single();
  if (!tx) return { ok: false, error: "Muamala haukupatikana" };
  const m = tx.members as unknown as { full_name: string; phone_number: string };
  const items = (tx.transaction_items as unknown as { amount: number; offering_categories: { code: string } }[])
    .map((i) => ({ code: i.offering_categories.code, amount: Number(i.amount) }));
  const text = receiptSms(m.full_name, tx.transaction_date, items, Number(tx.total_amount), tx.receipt_number);
  try {
    const { resolveNextSmsCredentials, sendNextSms } = await import("../nextsms.server");
    const r = await sendNextSms(resolveNextSmsCredentials(process.env), m.phone_number, text);
    await db.from("transactions").update({ sms_status: "sent", sms_response: r.messageId }).eq("id", txId);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SMS imeshindwa";
    await db.from("transactions").update({ sms_status: "failed", sms_response: msg }).eq("id", txId);
    return { ok: false, error: msg };
  }
}

async function requireStaff(token: string, roles: string[]) {
  const db = await admin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new Error("Tafadhali ingia tena");
  const { data: ok } = await db.rpc("has_any_role", { _user_id: data.user.id, _roles: roles });
  if (!ok) throw new Error("Huna ruhusa");
  return data.user.id;
}

// Public: look up a member's name by phone for the /give portal (name only).
export const lookupMember = createServerFn({ method: "POST" })
  .inputValidator((i: { phone: string }) => z.object({ phone: z.string().max(20) }).parse(i))
  .handler(async ({ data }) => {
    const phone = normalizeTzPhone(data.phone);
    if (!phone) return { phone: null, full_name: null };
    const { data: m } = await (await admin()).from("members").select("full_name").eq("phone_number", phone).maybeSingle();
    return { phone, full_name: m?.full_name ?? null };
  });

// Public online giving. Payment confirmation is simulated until a gateway (AzamPay/Selcom/Pesapal) is connected.
export const processOnlinePayment = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    phone: z.string().max(20),
    full_name: z.string().trim().min(2).max(120),
    network: z.enum(["M-Pesa", "Mixx by Yas", "Airtel Money", "HaloPesa"]),
    items: z.array(z.object({ category_id: z.string().uuid(), amount: z.number().int().min(0).max(100_000_000) })).max(30),
  }).parse(i))
  .handler(async ({ data }) => {
    const phone = normalizeTzPhone(data.phone);
    if (!phone) return { ok: false as const, error: "Namba ya simu si sahihi" };
    const items = data.items.filter((i) => i.amount > 0);
    if (!items.length) return { ok: false as const, error: "Weka kiasi kwenye kundi moja angalau" };
    const db = await admin();
    let { data: m } = await db.from("members").select("id").eq("phone_number", phone).maybeSingle();
    if (!m) {
      const r = await db.from("members").insert({ full_name: data.full_name, phone_number: phone }).select("id").single();
      if (r.error) return { ok: false as const, error: "Imeshindwa kusajili mwanachama" };
      m = r.data;
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data: txId, error } = await db.rpc("record_offering", {
      _member_id: m.id, _date: today, _method: "Online Portal", _items: items, _notes: `Mtandao: ${data.network}`,
    });
    if (error || !txId) return { ok: false as const, error: error?.message ?? "Imeshindwa" };
    const sms = await sendReceipt(txId as string);
    const { data: tx } = await db.from("transactions").select("receipt_number, total_amount, transaction_date").eq("id", txId as string).single();
    return { ok: true as const, receipt: tx!.receipt_number, total: Number(tx!.total_amount), date: tx!.transaction_date, sms: sms.ok };
  });

export const sendReceiptSms = createServerFn({ method: "POST" })
  .inputValidator((i: { token: string; txId: string }) => z.object({ token: z.string(), txId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    await requireStaff(data.token, ["head_treasurer", "assistant_treasurer", "super_admin", "admin"]);
    return sendReceipt(data.txId);
  });
