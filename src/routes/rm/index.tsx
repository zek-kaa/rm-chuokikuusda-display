import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, Pie, PieChart, Cell, Area, AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { tzs } from "@/lib/rm/format";
import { useTransactions, rangeFor, accessToken, useStaffRoles, perms, type TxRow } from "@/lib/rm/data";
import { sendReceiptSms } from "@/lib/rm/offerings.functions";
import { ReceiptDialog, type ReceiptData } from "@/components/rm/Receipt";

export const Route = createFileRoute("/rm/")({ component: RmDashboard });

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 200 70% 50%))", "hsl(var(--chart-3, 38 92% 50%))", "hsl(var(--chart-4, 280 60% 55%))", "hsl(var(--chart-5, 0 70% 55%))"];

export function toReceipt(t: TxRow): ReceiptData {
  return { receipt: t.receipt_number, date: t.transaction_date, name: t.members?.full_name ?? "", method: t.payment_method, total: Number(t.total_amount),
    items: t.transaction_items.map((i) => ({ name: i.offering_categories?.name ?? "", amount: Number(i.amount) })) };
}

function RmDashboard() {
  const [preset, setPreset] = useState("month");
  const [custom, setCustom] = useState<[string, string]>(rangeFor("month"));
  const [from, to] = preset === "custom" ? custom : rangeFor(preset);
  const { data: txs = [], isLoading } = useTransactions(from, to);
  const roles = useStaffRoles();
  const canWrite = perms(roles.data?.roles ?? []).write;
  const resend = useServerFn(sendReceiptSms);
  const qc = useQueryClient();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const live = txs.filter((t) => t.status !== "voided");
  const items = live.flatMap((t) => t.transaction_items);
  const total = live.reduce((s, t) => s + Number(t.total_amount), 0);
  const local = items.reduce((s, i) => s + Number(i.local_church_amount), 0);
  const conf = items.reduce((s, i) => s + Number(i.conference_amount), 0);
  const sent = live.filter((t) => t.sms_status === "sent").length;
  const failed = live.filter((t) => t.sms_status === "failed").length;

  const byCat = Object.values(items.reduce<Record<string, { name: string; value: number }>>((a, i) => {
    const n = i.offering_categories?.name ?? "?"; (a[n] ??= { name: n, value: 0 }).value += Number(i.amount); return a; }, {}));
  const byMethod = Object.values(live.reduce<Record<string, { name: string; value: number }>>((a, t) => {
    (a[t.payment_method] ??= { name: t.payment_method, value: 0 }).value += Number(t.total_amount); return a; }, {}));
  const trend = Object.values(live.reduce<Record<string, { date: string; value: number }>>((a, t) => {
    (a[t.transaction_date] ??= { date: t.transaction_date, value: 0 }).value += Number(t.total_amount); return a; }, {})).sort((a, b) => a.date.localeCompare(b.date));

  async function doResend(id: string) {
    const r = await resend({ data: { token: await accessToken(), txId: id } });
    r.ok ? toast.success("SMS imetumwa") : toast.error(r.error ?? "Imeshindwa");
    qc.invalidateQueries({ queryKey: ["rm-tx"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-2xl font-bold">Dashboard ya Fedha</h1>
        {[["today", "Leo"], ["7d", "Siku 7 / Sabato"], ["month", "Mwezi huu"], ["year", "Mwaka huu"], ["custom", "Chagua"]].map(([k, l]) => (
          <Button key={k} size="sm" variant={preset === k ? "default" : "outline"} onClick={() => setPreset(k)}>{l}</Button>
        ))}
        {preset === "custom" && <div className="flex gap-1">
          <Input type="date" value={custom[0]} onChange={(e) => setCustom([e.target.value, custom[1]])} />
          <Input type="date" value={custom[1]} onChange={(e) => setCustom([custom[0], e.target.value])} />
        </div>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Jumla ya Makusanyo" value={tzs(total)} />
        <Kpi title="Inabaki Kanisani" value={tzs(local)} />
        <Kpi title="Deni kwa Konferensi" value={tzs(conf)} />
        <Kpi title="Risiti / SMS" value={`${live.length} risiti`} sub={`${sent} Zimetumwa / ${failed} Zimeshindwa`} />
      </div>
      {isLoading ? <p className="text-muted-foreground">Inapakia...</p> : <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Kwa Kundi</CardTitle></CardHeader><CardContent className="h-64">
          <ResponsiveContainer><BarChart data={byCat}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => tzs(v)} /><Bar dataKey="value" fill={COLORS[0]} /></BarChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Mgawanyo wa Makundi</CardTitle></CardHeader><CardContent className="h-64">
          <ResponsiveContainer><PieChart><Pie data={byCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} label>{byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => tzs(v)} /></PieChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Mwenendo wa Makusanyo</CardTitle></CardHeader><CardContent className="h-64">
          <ResponsiveContainer><AreaChart data={trend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => tzs(v)} /><Area dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.25} /></AreaChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Njia za Malipo</CardTitle></CardHeader><CardContent className="h-64">
          <ResponsiveContainer><PieChart><Pie data={byMethod} dataKey="value" nameKey="name" outerRadius={90} label>{byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => tzs(v)} /></PieChart></ResponsiveContainer>
        </CardContent></Card>
      </div>}
      <Card><CardHeader><CardTitle className="text-base">Miamala ya Karibuni</CardTitle></CardHeader><CardContent className="space-y-2">
        {live.slice(0, 10).map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-2 border-b pb-2 text-sm">
            <span className="font-mono">{t.receipt_number}</span>
            <span className="mr-auto">{t.members?.full_name}</span>
            <span className="tabular-nums font-semibold text-primary">{tzs(Number(t.total_amount))}</span>
            <Badge variant={t.sms_status === "failed" ? "destructive" : "secondary"}>SMS: {t.sms_status}</Badge>
            <Button size="sm" variant="outline" onClick={() => setReceipt(toReceipt(t))}>Risiti</Button>
            {canWrite && <Button size="sm" variant="outline" onClick={() => doResend(t.id)}>Tuma SMS tena</Button>}
          </div>
        ))}
        {!live.length && <p className="text-muted-foreground text-sm">Hakuna miamala kwa kipindi hiki.</p>}
      </CardContent></Card>
      <ReceiptDialog r={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}

function Kpi({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold tabular-nums">{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</CardContent></Card>;
}
