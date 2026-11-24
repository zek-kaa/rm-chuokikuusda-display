import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { db, useTransactions, useCategories, rangeFor, useStaffRoles, perms, type TxRow } from "@/lib/rm/data";
import { tzs, PAYMENT_METHODS } from "@/lib/rm/format";
import { ReceiptDialog, toReceipt, type ReceiptData } from "@/components/rm/Receipt";


const sel = "h-10 rounded-md border border-input bg-background px-2 text-sm";

function summary(txs: TxRow[]) {
  const m: Record<string, { name: string; total: number; local: number; conf: number }> = {};
  txs.filter((t) => t.status !== "voided").forEach((t) => t.transaction_items.forEach((i) => {
    const n = i.offering_categories?.name ?? "?"; const r = (m[n] ??= { name: n, total: 0, local: 0, conf: 0 });
    r.total += Number(i.amount); r.local += Number(i.local_church_amount); r.conf += Number(i.conference_amount);
  }));
  return Object.values(m);
}

function pdfReport(title: string, period: string, txs: TxRow[]) {
  const doc = new jsPDF(); const s = summary(txs);
  doc.setFontSize(14); doc.text("Seventh-day Adventist Church - Chuo Kikuu", 105, 15, { align: "center" });
  doc.setFontSize(11); doc.text(title, 105, 22, { align: "center" }); doc.text(`Period: ${period}`, 105, 28, { align: "center" });
  autoTable(doc, { startY: 34, head: [["Category", "Total", "Church", "Conference"]],
    body: [...s.map((r) => [r.name, tzs(r.total), tzs(r.local), tzs(r.conf)]),
      ["TOTAL", tzs(s.reduce((a, r) => a + r.total, 0)), tzs(s.reduce((a, r) => a + r.local, 0)), tzs(s.reduce((a, r) => a + r.conf, 0))]] });
  autoTable(doc, { head: [["Receipt", "Date", "Member", "Method", "Status", "Amount"]],
    body: txs.map((t) => [t.receipt_number, t.transaction_date, t.members?.full_name ?? "", t.payment_method, t.status, tzs(Number(t.total_amount))]) });
  let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 25;
  if (y > 260) { doc.addPage(); y = 30; }
  ["Head Treasurer", "Head Elder", "Pastor"].forEach((r, i) => { const x = 15 + i * 65; doc.line(x, y, x + 55, y); doc.setFontSize(9); doc.text(r, x, y + 5); });
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function ReportsPanel() {
  const [[from, to], setRange] = useState(rangeFor("month"));
  const [cat, setCat] = useState(""); const [method, setMethod] = useState(""); const [status, setStatus] = useState(""); const [q, setQ] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const { data: txs = [] } = useTransactions(from, to);
  const cats = useCategories();
  const p = perms(useStaffRoles().data?.roles ?? []);
  const qc = useQueryClient();
  const logs = useQuery({ queryKey: ["audit"], enabled: p.head || !p.write, queryFn: async () =>
    (await db().from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50)).data ?? [] });

  const rows = txs.filter((t) => (!cat || t.transaction_items.some((i) => i.category_id === cat)) && (!method || t.payment_method === method)
    && (!status || t.status === status) && (!q || `${t.members?.full_name} ${t.members?.phone_number} ${t.receipt_number}`.toLowerCase().includes(q.toLowerCase())));

  function excel() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.flatMap((t) => t.transaction_items.map((i) => ({
      Receipt: t.receipt_number, Date: t.transaction_date, Member: t.members?.full_name, Phone: t.members?.phone_number, Method: t.payment_method,
      Status: t.status, Category: i.offering_categories?.name, Amount: Number(i.amount), Church: Number(i.local_church_amount), Conference: Number(i.conference_amount) })))), "Itemized Transactions");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary(rows).map((r) => ({ Category: r.name, Total: r.total, Church: r.local, Conference: r.conf }))), "Category Split Summary");
    XLSX.writeFile(wb, `report_${from}_${to}.xlsx`);
  }
  async function voidReq(t: TxRow) {
    const reason = window.prompt("Reason for voiding this transaction (required):");
    if (!reason?.trim()) return;
    const { error } = await db().rpc("request_void", { _tx: t.id, _reason: reason });
    if (error) toast.error(error.message); else { toast.success("Request sent to Head Treasurer"); qc.invalidateQueries({ queryKey: ["rm-tx"] }); }
  }
  async function decide(t: TxRow, approve: boolean) {
    const { error } = await db().rpc("decide_void", { _tx: t.id, _approve: approve });
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["rm-tx"] });
  }
  async function statement() {
    const phone = window.prompt("Phone number au jina la mwanachama:"); if (!phone) return;
    const mine = txs.filter((t) => `${t.members?.full_name} ${t.members?.phone_number}`.toLowerCase().includes(phone.toLowerCase().replace(/^0/, "")));
    if (!mine.length) return toast.error("No contributions for this member in this period");
    pdfReport(`Contribution Statement - ${mine[0]!.members?.full_name}`, `${from} to ${to}`, mine);
  }

  return (
    <div className="space-y-4">
      <Card className="treasury-panel"><CardContent className="flex flex-wrap gap-2 pt-6">
        <Input type="date" className="w-40" value={from} onChange={(e) => setRange([e.target.value, to])} />
        <Input type="date" className="w-40" value={to} onChange={(e) => setRange([from, e.target.value])} />
        <select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className={sel} value={method} onChange={(e) => setMethod(e.target.value)}><option value="">All methods</option>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="completed">completed</option><option value="void_requested">void_requested</option><option value="voided">voided</option></select>
        <Input className="w-56" placeholder="Search member / receipt" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={excel}>Excel</Button>
          <Button variant="outline" onClick={() => pdfReport("Church Financial Report", `${from} to ${to}`, rows)}>PDF</Button>
          <Button variant="outline" onClick={statement}>Member Statement</Button>
        </div>
      </CardContent></Card>
      <Card className="treasury-panel"><CardContent className="overflow-x-auto pt-6">
        <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Receipt</th><th>Date</th><th>Member</th><th>Method</th><th>Kiasi</th><th>Status</th><th>SMS</th><th /></tr></thead>
          <tbody>{rows.map((t) => <tr key={t.id} className="border-t">
            <td className="py-2 font-mono">{t.receipt_number}</td><td>{t.transaction_date}</td><td>{t.members?.full_name}</td><td>{t.payment_method}</td>
            <td className="tabular-nums font-semibold">{tzs(Number(t.total_amount))}</td>
            <td><Badge variant={t.status === "voided" ? "destructive" : t.status === "void_requested" ? "outline" : "secondary"} title={t.void_reason ?? ""}>{t.status}</Badge></td>
            <td>{t.sms_status}</td>
            <td className="flex gap-1 py-1">
              <Button size="sm" variant="ghost" onClick={() => setReceipt(toReceipt(t))}>Receipt</Button>
              {p.write && t.status === "completed" && <Button size="sm" variant="ghost" onClick={() => voidReq(t)}>Request Void</Button>}
              {p.head && t.status === "void_requested" && <><Button size="sm" onClick={() => decide(t, true)}>Approve</Button><Button size="sm" variant="outline" onClick={() => decide(t, false)}>Reject</Button></>}
            </td></tr>)}</tbody></table>
        {!rows.length && <p className="text-sm text-muted-foreground">No transactions.</p>}
      </CardContent></Card>
      {logs.data && logs.data.length > 0 && <Card className="treasury-panel"><CardHeader><CardTitle className="text-base">Audit Log</CardTitle></CardHeader><CardContent className="space-y-1 text-xs">
        {logs.data.map((l) => <div key={l.id} className="flex gap-3 border-b py-1"><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span><span>{l.action}</span><span className="truncate">{JSON.stringify(l.details)}</span></div>)}
      </CardContent></Card>}
      <ReceiptDialog r={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
