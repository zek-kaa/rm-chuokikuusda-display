import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaffRoles, perms } from "@/lib/rm/data";

export const Route = createFileRoute("/rm")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Treasurer Dashboard | SDA Chuo Kikuu" },
    { name: "description", content: "Record offerings, send SMS receipts, view reports and conference allocations." },
    { property: "og:title", content: "Treasurer Dashboard | SDA Chuo Kikuu" },
    { property: "og:description", content: "Record offerings, send SMS receipts, view reports and conference allocations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RmLayout,
});

function RmLayout() {
  const { data, isLoading } = useStaffRoles();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading...</div>;
  if (!data?.userId || !perms(data.roles).staff) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <ShieldAlert className="h-10 w-10 text-gold" />
      <h1 className="text-2xl font-bold text-church-blue">Access required</h1>
      <p className="max-w-sm text-muted-foreground">This area is for the Head Treasurer, Assistant Treasurer and Auditor only.</p>
      <Button asChild variant="outline"><Link to="/">Sign in or go home</Link></Button>
    </div>
  );
  return <Outlet />;
}
