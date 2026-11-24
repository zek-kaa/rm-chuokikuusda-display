import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { db, useCategories, useStaffRoles, perms, type Category } from "@/lib/rm/data";
import { tzs } from "@/lib/rm/format";


export function CategoriesPanel() {
  const cats = useCategories();
  const roles = useStaffRoles();
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Category> | null>(null);
  const totals = useQuery({ queryKey: ["cat-totals"], queryFn: async () => {
    const { data } = await db().from("transaction_items").select("category_id, amount, transactions!inner(status)").neq("transactions.status", "voided");
    const t: Record<string, number> = {}; (data ?? []).forEach((i) => { t[i.category_id] = (t[i.category_id] ?? 0) + Number(i.amount); }); return t;
  } });
  if (!perms(roles.data?.roles ?? []).head) return <p>Head Treasurer only.</p>;
  const refresh = () => qc.invalidateQueries({ queryKey: ["rm-categories"] });

  async function save() {
    if (!edit) return;
    const l = Number(edit.local_church_share), c = Number(edit.conference_share);
    if (l + c !== 100) return toast.error("Church + Conference share must equal 100");
    if (!edit.name || !edit.code) return toast.error("Name and code are required");
    const row = { name: edit.name, code: edit.code.toUpperCase(), description: edit.description ?? null, local_church_share: l, conference_share: c };
    const { error } = edit.id ? await db().from("offering_categories").update(row).eq("id", edit.id) : await db().from("offering_categories").insert(row);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEdit(null); refresh();
  }
  async function toggle(c: Category) {
    await db().from("offering_categories").update({ is_active: !c.is_active }).eq("id", c.id); refresh();
  }
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEdit({ local_church_share: 100, conference_share: 0 })}>+ Add</Button></div>
      <Card className="treasury-panel"><CardContent className="overflow-x-auto pt-6">
        <table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th>Name</th><th>Code</th><th>Church %</th><th>Conference %</th><th>Total</th><th>Hai</th><th /></tr></thead>
          <tbody>{(cats.data ?? []).map((c) => <tr key={c.id} className="border-t">
            <td className="py-2">{c.name}</td><td>{c.code}</td><td>{c.local_church_share}</td><td>{c.conference_share}</td>
            <td className="tabular-nums">{tzs(totals.data?.[c.id] ?? 0)}</td>
            <td><Switch checked={c.is_active} onCheckedChange={() => toggle(c)} /></td>
            <td><Button size="sm" variant="ghost" onClick={() => setEdit(c)}>Edit</Button></td></tr>)}</tbody></table>
      </CardContent></Card>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}><DialogContent>
        <DialogHeader><DialogTitle>{edit?.id ? "Edit Category" : "New Category"}</DialogTitle></DialogHeader>
        {edit && <div className="space-y-3">
          <div><Label>Name</Label><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
          <div><Label>Code</Label><Input value={edit.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></div>
          <div><Label>Description</Label><Input value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Church %</Label><Input type="number" value={edit.local_church_share ?? 0} onChange={(e) => setEdit({ ...edit, local_church_share: Number(e.target.value), conference_share: 100 - Number(e.target.value) })} /></div>
            <div><Label>Conference %</Label><Input type="number" value={edit.conference_share ?? 0} onChange={(e) => setEdit({ ...edit, conference_share: Number(e.target.value) })} /></div>
          </div>
          <Button className="w-full" onClick={save}>Save</Button>
        </div>}
      </DialogContent></Dialog>
    </div>
  );
}
