import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { tzs } from "@/lib/rm/format";
import { lookupMember, processOnlinePayment } from "@/lib/rm/offerings.functions";
import { ReceiptView, downloadReceiptPdf, type ReceiptData } from "@/components/rm/Receipt";
import { getSupabaseClient } from "@/lib/supabase/client";

export const Route = createFileRoute("/give")({
  head: () => ({ meta: [
    { title: "Toa Sadaka Mtandaoni | SDA Chuo Kikuu RM" },
    { name: "description", content: "Toa RM, Zaka, Sadaka na Ujenzi kwa simu bila nenosiri, upokee risiti kwa SMS." },
    { property: "og:title", content: "Toa Sadaka Mtandaoni | SDA Chuo Kikuu RM" },
    { property: "og:description", content: "Toa matoleo yako kwa M-Pesa, Mixx by Yas, Airtel Money au HaloPesa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: GivePage,
});

const NETWORKS = ["M-Pesa", "Mixx by Yas", "Airtel Money", "HaloPesa"] as const;

function GivePage() {
  const lookup = useServerFn(lookupMember);
  const pay = useServerFn(processOnlinePayment);
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [known, setKnown] = useState(false);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [network, setNetwork] = useState<(typeof NETWORKS)[number]>("M-Pesa");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const cats = useQuery({ queryKey: ["give-cats"], queryFn: async () => {
    const { data } = await getSupabaseClient().from("offering_categories").select("id,name,code").eq("is_active", true).order("created_at");
    return data ?? [];
  } });
  const total = Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0);

  async function next() {
    setBusy(true);
    const r = await lookup({ data: { phone } });
    setBusy(false);
    if (!r.phone) return toast.error("Namba ya simu si sahihi (mfano 0752xxxxxx)");
    setPhone(r.phone); if (r.full_name) { setName(r.full_name); setKnown(true); } else setKnown(false);
    setStep(2);
  }
  async function submit() {
    if (name.trim().length < 2) return toast.error("Weka jina lako kamili");
    if (total <= 0) return toast.error("Weka kiasi angalau kwenye kundi moja");
    setBusy(true);
    const items = (cats.data ?? []).map((c) => ({ category_id: c.id, amount: Math.round(Number(amounts[c.id]) || 0) }));
    const r = await pay({ data: { phone, full_name: name, network, items } });
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    setReceipt({ receipt: r.receipt, date: r.date, name, phone, method: `Online Portal (${network})`, total: r.total,
      items: (cats.data ?? []).filter((c) => Number(amounts[c.id]) > 0).map((c) => ({ name: c.name, amount: Number(amounts[c.id]) })) });
    if (!r.sms) toast.warning("Malipo yamepokelewa, lakini SMS ya risiti haikutumwa.");
    setStep(4);
  }

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8">
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Toa Matoleo</CardTitle>
          <p className="text-sm text-muted-foreground">SDA Chuo Kikuu · RM Offerings</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && <>
            <Label htmlFor="ph">Namba ya simu</Label>
            <Input id="ph" inputMode="tel" placeholder="0752 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button className="w-full" disabled={busy} onClick={next}>Endelea</Button>
          </>}
          {step === 2 && <>
            <Label htmlFor="nm">Jina kamili</Label>
            <Input id="nm" value={name} readOnly={known} onChange={(e) => setName(e.target.value)} />
            {!known && <p className="text-xs text-muted-foreground">Namba hii ni mpya — utasajiliwa moja kwa moja.</p>}
            {(cats.data ?? []).map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <Label className="w-40" htmlFor={c.id}>{c.name}</Label>
                <Input id={c.id} inputMode="numeric" className="tabular-nums" placeholder="0" value={amounts[c.id] ?? ""}
                  onChange={(e) => setAmounts({ ...amounts, [c.id]: e.target.value.replace(/\D/g, "") })} />
              </div>
            ))}
            <div className="flex justify-between rounded-md bg-muted p-3 font-semibold"><span>Jumla</span><span className="tabular-nums text-primary">{tzs(total)}</span></div>
            <Button className="w-full" disabled={total <= 0} onClick={() => setStep(3)}>Endelea kulipa</Button>
          </>}
          {step === 3 && <>
            <p className="text-sm">Chagua mtandao wa kulipia {tzs(total)}</p>
            <div className="grid grid-cols-2 gap-2">
              {NETWORKS.map((n) => <Button key={n} variant={n === network ? "default" : "outline"} onClick={() => setNetwork(n)}>{n}</Button>)}
            </div>
            <Button className="w-full" disabled={busy} onClick={submit}>{busy ? "Inachakata..." : "Lipa Sasa"}</Button>
            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>Rudi</Button>
          </>}
          {step === 4 && receipt && <>
            <ReceiptView r={receipt} />
            <Button className="w-full" onClick={() => downloadReceiptPdf(receipt)}>Pakua risiti</Button>
            <Button variant="outline" className="w-full" onClick={() => { setStep(1); setAmounts({}); setReceipt(null); }}>Toa tena</Button>
          </>}
          <Link to="/" className="block text-center text-xs text-muted-foreground underline">Rudi mwanzo</Link>
        </CardContent>
      </Card>
    </div>
  );
}
