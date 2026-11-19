import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "SDA Chuo Kikuu | Resource Mobilization" },
    { name: "description", content: "Michango na maendeleo ya Kanisa la SDA Chuo Kikuu." },
    { property: "og:title", content: "SDA Chuo Kikuu | Resource Mobilization" },
    { property: "og:description", content: "Michango na maendeleo ya Kanisa la SDA Chuo Kikuu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Index,
});
