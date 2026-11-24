import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { tzs } from "@/lib/rm/format";
import jsPDF from "jspdf";
import type { TxRow } from "@/lib/rm/data";

export type ReceiptData = { receipt: string; date: string; name: string; phone?: string; method: string; items: { name: string; amount: number }[]; total: number };

export function downloadReceiptPdf(r: ReceiptData) {
  const doc = new jsPDF({ unit: "mm", format: [80, 140] });
  let y = 10;
  doc.setFontSize(12); doc.text("SDA Chuo Kikuu - RM", 40, y, { align: "center" }); y += 6;
  doc.setFontSize(9); doc.text(`Risiti: ${r.receipt}`, 6, y); y += 5;
  doc.text(`Tarehe: ${r.date}`, 6, y); y += 5;
  doc.text(`Jina: ${r.name}`, 6, y); y += 5;
  doc.text(`Njia: ${r.method}`, 6, y); y += 7;
  r.items.forEach((i) => { doc.text(i.name, 6, y); doc.text(tzs(i.amount), 74, y, { align: "right" }); y += 5; });
  y += 2; doc.setFontSize(11); doc.text("Jumla", 6, y); doc.text(tzs(r.total), 74, y, { align: "right" }); y += 10;
  doc.setFontSize(8); doc.text("Mungu akubariki.", 40, y, { align: "center" });
  doc.save(`${r.receipt}.pdf`);
}

export function ReceiptView({ r }: { r: ReceiptData }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-muted-foreground">Risiti</span><span className="font-semibold">{r.receipt}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Tarehe</span><span>{r.date}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Jina</span><span>{r.name}</span></div>
      <div className="flex justify-between"><span className="text-muted-foreground">Njia</span><span>{r.method}</span></div>
      <div className="border-t pt-2 space-y-1">
        {r.items.map((i) => <div key={i.name} className="flex justify-between"><span>{i.name}</span><span className="tabular-nums">{tzs(i.amount)}</span></div>)}
      </div>
      <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Jumla</span><span className="tabular-nums text-primary">{tzs(r.total)}</span></div>
    </div>
  );
}

export function ReceiptDialog({ r, onClose }: { r: ReceiptData | null; onClose: () => void }) {
  return (
    <Dialog open={!!r} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Risiti</DialogTitle></DialogHeader>
        {r && <ReceiptView r={r} />}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => window.print()}>Chapisha</Button>
          {r && <Button onClick={() => downloadReceiptPdf(r)}>Pakua PDF</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function toReceipt(t: TxRow): ReceiptData {
  return { receipt: t.receipt_number, date: t.transaction_date, name: t.members?.full_name ?? "", method: t.payment_method, total: Number(t.total_amount),
    items: t.transaction_items.map((i) => ({ name: i.offering_categories?.name ?? "", amount: Number(i.amount) })) };
}

