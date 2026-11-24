import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { db } from "@/lib/rm/data";
import { normalizeTzPhone } from "@/lib/rm/format";

export function QuickAddMember({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (m: { id: string; full_name: string; phone_number: string }) => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [zone, setZone] = useState("");
  async function save() {
    const p = normalizeTzPhone(phone);
    if (!p) return toast.error("Namba ya simu si sahihi");
    if (name.trim().length < 2) return toast.error("Weka jina");
    const { data, error } = await db().from("members").insert({ full_name: name.trim(), phone_number: p, zone_or_group: zone || null }).select("id, full_name, phone_number").single();
    if (error) return toast.error(error.code === "23505" ? "Namba hii tayari imesajiliwa" : error.message);
    onAdded(data); setName(""); setPhone(""); setZone(""); onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Ongeza Mwanachama</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Jina kamili</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Namba ya simu</Label><Input value={phone} placeholder="0752..." onChange={(e) => setPhone(e.target.value)} /></div>
          <div><Label>Kanda / Kikundi (si lazima)</Label><Input value={zone} onChange={(e) => setZone(e.target.value)} /></div>
          <Button className="w-full" onClick={save}>Hifadhi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
