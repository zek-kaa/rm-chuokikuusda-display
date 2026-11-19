import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RM Chuokikuusda" },
      { name: "description", content: "RM Chuokikuusda" },
      { property: "og:title", content: "RM Chuokikuusda" },
      { property: "og:description", content: "RM Chuokikuusda" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <h1 className="text-center text-5xl font-bold tracking-tight text-foreground md:text-7xl">
        RM Chuokikuusda
      </h1>
    </main>
  );
}
