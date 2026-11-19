import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useStaffRoles, perms } from "@/lib/rm/data";

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
    { to: "/rm", label: "Dashboard", show: true },
    { to: "/rm/offerings/new", label: "Rekodi Sadaka", show: p.write },
    { to: "/rm/offerings/bulk-upload", label: "Pakia Excel", show: p.write },
    { to: "/rm/reports", label: "Ripoti & Miamala", show: true },
    { to: "/rm/categories", label: "Makundi ya Sadaka", show: p.head },
  ] as const;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-sidebar text-sidebar-foreground md:w-60 md:min-h-screen p-4">
        <div className="mb-6 text-lg font-bold">RM Offerings</div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {links.filter((l) => l.show).map((l) => (
            <Link key={l.to} to={l.to} activeOptions={{ exact: true }}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-semibold" }}>{l.label}</Link>
          ))}
          <Link to="/dashboard" className="whitespace-nowrap rounded-md px-3 py-2 text-sm opacity-70 hover:bg-sidebar-accent">← Dashboard yangu</Link>
        </nav>
      </aside>
      <main className="flex-1 bg-muted/30 p-4 md:p-8"><Outlet /></main>
    </div>
  );
}
