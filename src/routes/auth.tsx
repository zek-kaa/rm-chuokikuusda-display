import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/pages/Auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Ingia | SDA Chuo Kikuu RM" },
    { name: "description", content: "Ingia au jisajili kwenye mfumo wa michango wa SDA Chuo Kikuu." },
    { property: "og:title", content: "Ingia | SDA Chuo Kikuu RM" },
    { property: "og:description", content: "Ingia au jisajili kwenye mfumo wa michango wa SDA Chuo Kikuu." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Auth,
});
