import { createFileRoute } from "@tanstack/react-router";
import GuestDashboard from "@/pages/GuestDashboard";

export const Route = createFileRoute("/guest-dashboard")({
  head: () => ({ meta: [
    { title: "Michango ya Wageni | SDA Chuo Kikuu RM" },
    { name: "description", content: "Shiriki katika michango ya maendeleo ya SDA Chuo Kikuu kama mgeni." },
    { property: "og:title", content: "Michango ya Wageni | SDA Chuo Kikuu RM" },
    { property: "og:description", content: "Shiriki katika michango ya maendeleo ya SDA Chuo Kikuu kama mgeni." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: GuestDashboard,
});
