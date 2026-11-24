import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useStaffRoles, perms } from "@/lib/rm/data";
import { ArrowLeft, ChartNoAxesCombined, FileSpreadsheet, LayoutDashboard, List, PlusCircle, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rm")({
  ssr: false,
  head: () => ({ meta: [
    { title: "RM Offerings System | SDA Chuo Kikuu" },
    { name: "description", content: "Mfumo wa Mhazini: kurekodi sadaka, risiti za SMS, ripoti na mgao wa konferensi." },
    { property: "og:title", content: "RM Offerings System | SDA Chuo Kikuu" },
    { property: "og:description", content: "Kurekodi sadaka, risiti za SMS, ripoti na mgao wa konferensi." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: RmLayout,
});

function RmLayout() {
  const { data, isLoading } = useStaffRoles();
  if (isLoading) return <div className="p-8 text-muted-foreground">Inapakia...</div>;
  const p = perms(data?.roles ?? []);
  if (!data?.userId || !p.staff) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">Ruhusa inahitajika</h1>
      <p className="text-muted-foreground">Ukurasa huu ni wa Mhazini, Msaidizi wa Mhazini na Mkaguzi tu.</p>
      <Link to="/" className="underline">Ingia au rudi mwanzo</Link>
    </div>
  );
  const links = [
    { to: "/rm", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/rm/offerings/new", label: "Rekodi Sadaka", icon: PlusCircle, show: p.write },
    { to: "/rm/offerings/bulk-upload", label: "Pakia Excel", icon: FileSpreadsheet, show: p.write },
    { to: "/rm/reports", label: "Ripoti & Miamala", icon: ChartNoAxesCombined, show: true },
    { to: "/rm/categories", label: "Makundi ya Sadaka", icon: List, show: p.head },
  ] as const;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="gradient-hero shrink-0 border-b border-gold/30 p-4 text-primary-foreground md:min-h-screen md:w-60 md:border-b-0 md:border-r">
        <div className="mb-6 flex items-center gap-3 border-b border-primary-foreground/15 pb-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg gradient-gold text-church-blue-dark"><Wallet className="h-5 w-5" /></span>
          <div><p className="text-xs text-primary-foreground/70">SDA Chuo Kikuu</p><p className="text-lg font-bold text-gold-light">RM Mhazini</p></div>
        </div>
        <nav aria-label="Treasurer navigation" className="flex gap-1 overflow-x-auto md:flex-col">
          {links.filter((l) => l.show).map((l) => (
            <Button asChild key={l.to} variant="ghost" className="h-10 justify-start text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link to={l.to} activeOptions={{ exact: true }} activeProps={{ className: "bg-gold/20 text-gold-light font-semibold" }}><l.icon className="h-4 w-4" />{l.label}</Link>
            </Button>
          ))}
          <Button asChild variant="ghost" className="h-10 justify-start text-primary-foreground/65 hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/dashboard"><ArrowLeft className="h-4 w-4" />Dashboard yangu</Link></Button>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 bg-background p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
