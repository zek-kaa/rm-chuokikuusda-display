// Browser Cloud client used by the whole app.
// Public URL/publishable key are embedded as a fallback because the hosted
// preview bundle does not always inject VITE_* values (caused "Missing Supabase env").
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { brokeredPreviewStorage } from "@/integrations/supabase/previewAuthStorage";
import { getSession } from "../auth";

const PUBLIC_URL = "https://c--eafe7fbc-e78f-4c22-871a-fe41eb262d54-prod.lovable.cloud";
const PUBLIC_KEY = "sb_publishable_iFgfizZFwHu0qUU_xIojyw_Wd7_kXJz";

let client: SupabaseClient | undefined;

function build(): SupabaseClient {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || PUBLIC_URL;
  const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || PUBLIC_KEY;
  return createClient(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        // Publishable keys are opaque, not JWTs.
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: brokeredPreviewStorage(), persistSession: true, autoRefreshToken: true },
  });
}

export function getSupabaseClient(): SupabaseClient {
  if (!client) client = build();
  return client;
}

export function createSupabaseClient(_accessToken?: string): SupabaseClient {
  return getSupabaseClient();
}

export function initializeSupabaseClient(): void {
  try {
    const session = getSession();
    if (session?.access_token && session.refresh_token && typeof window !== "undefined") {
      getSupabaseClient().auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token }).catch(() => {});
    }
  } catch {
    // ignore
  }
}
