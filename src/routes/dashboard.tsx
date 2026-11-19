import { createFileRoute, redirect } from "@tanstack/react-router";
import Dashboard from "@/pages/Dashboard";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "Michango Yangu | SDA Chuo Kikuu RM" },
    { name: "description", content: "Taarifa za michango na ahadi zako kwa SDA Chuo Kikuu." },
    { property: "og:title", content: "Michango Yangu | SDA Chuo Kikuu RM" },
    { property: "og:description", content: "Taarifa za michango na ahadi zako kwa SDA Chuo Kikuu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getSession()) {
      throw redirect({ to: "/" });
    }
  },
  component: Dashboard,
});
