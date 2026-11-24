import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { db, useCategories, today, accessToken, TX_SELECT, type TxRow } from "@/lib/rm/data";
import { tzs, PAYMENT_METHODS } from "@/lib/rm/format";
import { sendReceiptSms } from "@/lib/rm/offerings.functions";
import { QuickAddMember } from "@/components/rm/QuickAddMember";
import { ReceiptDialog, toReceipt, type ReceiptData } from "@/components/rm/Receipt";

export const Route = createFileRoute("/rm/offerings/new")({ head: () => ({ meta: [
  { title: "Record Offering | SDA Chuo Kikuu" },
  { name: "description", content: "Record church offerings and issue member receipts." },
  { property: "og:title", content: "Record Offering | SDA Chuo Kikuu" },
  { property: "og:description", content: "Record church offerings and issue member receipts." },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary" },
] }), component: NewOffering });

type M = { id: string; full_name: string; phone_number: string };

function NewOffering() {
  const cats = useCategories(true);
  const qc = useQueryClient();
  const send = useServerFn(sendReceiptSms);
  const [search, setSearch] = useState("");
  const [member, setMember] = useState<M | null>(null);
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState("Cash");
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const results = useQuery({
    queryKey: ["member-search", search], enabled: search.trim().length >= 2 && !member,
    queryFn: async () => {
      const s = search.trim().replace(/[,%()]/g, "");
      const { data } = await db().from("members").select("id, full_name, phone_number").or(`full_name.ilike.%${s}%,phone_number.ilike.%${s.replace(/^0/, "")}%`).limit(8);
      return (data ?? []) as M[];
    },
  });
  const total = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);

  async function save() {
    if (!member) return toast.error("Chagua mwanachama");
    if (total <= 0) return toast.error("Weka kiasi");
    setBusy(true);
    const items = (cats.data ?? []).map((c) => ({ category_id: c.id, amount: Math.round(Number(amounts[c.id]) || 0) }));
    const { data: txId, error } = await db().rpc("record_offering", { _member_id: member.id, _date: date, _method: method, _items: items, _notes: notes || null });
    if (error) { setBusy(false); return toast.error(error.message); }
    const sms = await send({ data: { token: await accessToken(), txId: txId as string } });
    if (sms.ok) toast.success("Imehifadhiwa na SMS imetumwa"); else toast.warning(`Imehifadhiwa, SMS imeshindwa: ${sms.error}`);
    const { data: tx } = await db().from("transactions").select(TX_SELECT).eq("id", txId as string).single();
    if (tx) setReceipt(toReceipt(tx as unknown as TxRow));
    setMember(null); setSearch(""); setAmounts({}); setNotes(""); setBusy(false);
    qc.invalidateQueries({ queryKey: ["rm-tx"] });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="treasury-page-heading text-2xl font-bold">Rekodi Sadaka</h1>
      <Card className="treasury-panel"><CardHeader><CardTitle className="text-base">Mwanachama</CardTitle></CardHeader><CardContent className="space-y-2">
        {member ? <div className="flex items-center justify-between rounded-md bg-muted p-3">
          <span>{member.full_name} · {member.phone_number}</span><Button size="sm" variant="ghost" onClick={() => setMember(null)}>Badilisha</Button>
        </div> : <>
          <Input autoFocus placeholder="Tafuta kwa jina au namba ya simu" value={search} onChange={(e) => setSearch(e.target.value)} />
          {(results.data ?? []).map((m) => <button key={m.id} className="block w-full rounded-md p-2 text-left text-sm hover:bg-muted" onClick={() => setMember(m)}>{m.full_name} · {m.phone_number}</button>)}
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>+ Ongeza Mwanachama Mpya</Button>
        </>}
      </CardContent></Card>
      <Card className="treasury-panel"><CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
        <div><Label>Tarehe</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><Label>Njia ya malipo</Label>
          <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.filter((m) => m !== "Online Portal").map((m) => <option key={m}>{m}</option>)}
          </select></div>
      </CardContent></Card>
      <Card className="treasury-panel"><CardHeader><CardTitle className="text-base">Makundi ya Sadaka</CardTitle></CardHeader><CardContent className="space-y-2">
        {(cats.data ?? []).map((c) => <div key={c.id} className="flex items-center gap-3">
          <Label className="w-44" htmlFor={c.id}>{c.name}</Label>
          <Input id={c.id} inputMode="numeric" className="tabular-nums" placeholder="0" value={amounts[c.id] ?? ""} onChange={(e) => setAmounts({ ...amounts, [c.id]: e.target.value.replace(/\D/g, "") })} />
        </div>)}
        <Textarea placeholder="Maelezo (si lazima)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-between rounded-md bg-muted p-3 text-lg font-bold"><span>Jumla</span><span className="tabular-nums text-primary">{tzs(total)}</span></div>
        <Button className="w-full" disabled={busy} onClick={save}>{busy ? "Inahifadhi..." : "Hifadhi & Tuma Risiti ya SMS"}</Button>
      </CardContent></Card>
      <QuickAddMember open={addOpen} onClose={() => setAddOpen(false)} onAdded={setMember} />
      <ReceiptDialog r={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
