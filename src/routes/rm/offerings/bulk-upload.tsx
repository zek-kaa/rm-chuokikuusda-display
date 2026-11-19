import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { db, useCategories, accessToken, today } from "@/lib/rm/data";
import { normalizeTzPhone, tzs, PAYMENT_METHODS } from "@/lib/rm/format";
import { sendReceiptSms } from "@/lib/rm/offerings.functions";

export const Route = createFileRoute("/rm/offerings/bulk-upload")({ component: Bulk });

type Row = { name: string; phone: string; date: string; method: string; amounts: Record<string, number> };

function Bulk() {
  const cats = useCategories(true);
  const send = useServerFn(sendReceiptSms);
  const qc = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [existing, setExisting] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<number | null>(null);
  const list = cats.data ?? [];

  function template() {
    const head = ["Full Name", "Phone Number", "Date (YYYY-MM-DD)", "Payment Method", ...list.map((c) => c.code)];
    const sample = [["Juma Hamisi", "0752000001", today(), "Cash", ...list.map((_, i) => (i === 0 ? 20000 : 0))],
      ["Neema John", "0713000002", today(), "M-Pesa", ...list.map((_, i) => (i === 1 ? 50000 : 0))]];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head, ...sample]), "Sadaka");
    XLSX.writeFile(wb, "rm_template.xlsx");
  }

  async function onFile(f: File) {
    const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false });
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]!]!, { raw: false });
    const parsed: Row[] = json.map((r) => ({
      name: String(r["Full Name"] ?? "").trim(), phone: String(r["Phone Number"] ?? "").trim(),
      date: String(r["Date (YYYY-MM-DD)"] ?? today()).trim(), method: String(r["Payment Method"] ?? "Cash").trim(),
      amounts: Object.fromEntries(list.map((c) => [c.id, Number(String(r[c.code] ?? "0").replace(/[^\d.]/g, "")) || 0])),
    }));
    setRows(parsed);
    const phones = parsed.map((r) => normalizeTzPhone(r.phone)).filter(Boolean) as string[];
    const { data } = await db().from("members").select("id, phone_number").in("phone_number", phones);
    setExisting(Object.fromEntries((data ?? []).map((m) => [m.phone_number, m.id])));
  }

  const check = (r: Row) => {
    const phone = normalizeTzPhone(r.phone); const tot = Object.values(r.amounts).reduce((a, b) => a + b, 0);
    const errs = [!phone && "Simu si sahihi", tot <= 0 && "Kiasi 0", !r.name && "Jina", !PAYMENT_METHODS.includes(r.method as never) && "Njia", !/^\d{4}-\d{2}-\d{2}$/.test(r.date) && "Tarehe"].filter(Boolean) as string[];
    return { phone, tot, errs };
  };
  const valid = rows.filter((r) => !check(r).errs.length);
  const grand = valid.reduce((s, r) => s + check(r).tot, 0);
  const upd = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function processAll() {
    const token = await accessToken(); setProgress(0); let done = 0, fail = 0;
    for (const r of valid) {
      const { phone } = check(r);
      let id = existing[phone!];
      if (!id) {
        const ins = await db().from("members").insert({ full_name: r.name, phone_number: phone! }).select("id").single();
        id = ins.data?.id ?? (await db().from("members").select("id").eq("phone_number", phone!).single()).data?.id ?? "";
      }
      const { data: tx, error } = await db().rpc("record_offering", { _member_id: id, _date: r.date, _method: r.method,
        _items: list.map((c) => ({ category_id: c.id, amount: r.amounts[c.id] ?? 0 })), _notes: "Excel" });
      if (error || !tx) fail++; else await send({ data: { token, txId: tx as string } });
      done++; setProgress(Math.round((done / valid.length) * 100));
    }
    toast.success(`Zimekamilika: ${done - fail}, zimeshindwa: ${fail}`);
    setRows([]); qc.invalidateQueries({ queryKey: ["rm-tx"] });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pakia Sadaka kwa Excel</h1>
      <Card><CardContent className="flex flex-wrap gap-3 pt-6">
        <Button variant="outline" onClick={template}>Pakua Template ya Excel (.xlsx)</Button>
        <label className="flex cursor-pointer items-center rounded-md border-2 border-dashed border-border px-4 py-2 text-sm"
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}>
          Buruta faili hapa au bofya kuchagua (.xlsx / .csv)
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
      </CardContent></Card>
      {rows.length > 0 && <>
        <div className="grid gap-3 sm:grid-cols-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Sahihi</p><p className="text-2xl font-bold">{valid.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Zenye makosa</p><p className="text-2xl font-bold text-destructive">{rows.length - valid.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Jumla</p><p className="text-2xl font-bold tabular-nums">{tzs(grand)}</p></CardContent></Card>
          <Card><CardContent className="pt-6 text-xs">{list.map((c) => <div key={c.id} className="flex justify-between"><span>{c.code}</span><span className="tabular-nums">{tzs(valid.reduce((s, r) => s + (r.amounts[c.id] ?? 0), 0))}</span></div>)}</CardContent></Card>
        </div>
        <Card><CardContent className="overflow-x-auto pt-6">
          <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Jina</th><th>Simu</th><th>Tarehe</th><th>Njia</th>{list.map((c) => <th key={c.id}>{c.code}</th>)}<th>Hali</th><th /></tr></thead>
            <tbody>{rows.map((r, i) => { const c = check(r); return (
              <tr key={i} className={`border-t ${c.errs.length ? "bg-destructive/10" : ""}`}>
                <td><Input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} /></td>
                <td><Input value={r.phone} className={c.phone ? "" : "border-destructive"} onChange={(e) => upd(i, { phone: e.target.value })} /></td>
                <td><Input value={r.date} onChange={(e) => upd(i, { date: e.target.value })} /></td>
                <td><Input value={r.method} onChange={(e) => upd(i, { method: e.target.value })} /></td>
                {list.map((k) => <td key={k.id}><Input className="w-24 tabular-nums" value={r.amounts[k.id] ?? 0} onChange={(e) => upd(i, { amounts: { ...r.amounts, [k.id]: Number(e.target.value) || 0 } })} /></td>)}
                <td>{c.errs.length ? <Badge variant="destructive">{c.errs.join(", ")}</Badge> : existing[c.phone!] ? <Badge variant="secondary">Mwanachama Aliyepo</Badge> : <Badge>Mpya (Atasajiliwa)</Badge>}</td>
                <td><Button size="sm" variant="ghost" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Futa</Button></td>
              </tr>); })}</tbody></table>
        </CardContent></Card>
        {progress !== null && <Progress value={progress} />}
        <Button disabled={!valid.length || (progress !== null && progress < 100)} onClick={processAll}>Thibitisha & Chakata Zote ({valid.length})</Button>
      </>}
    </div>
  );
}
