import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function accountEmail(phone: string): string {
  return `${phone}@phone.chuokikuu.invalid`;
}

// Separate user auth from the privileged writer: signing in must never replace its service identity.
export function createAccountAuthClient(url: string, key: string) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
}

export async function completeAccountSignup(admin: SupabaseClient, input: {
  phone: string; otp: string; password: string; full_name?: string; role?: string;
}) {
  const now = new Date().toISOString();
  const { data: code, error: lookupError } = await admin.from("otp_codes").select("id")
    .eq("phone", input.phone).eq("otp", input.otp).eq("verified", false)
    .gte("expires_at", now).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (lookupError) throw new Error("Imeshindwa kuthibitisha OTP. Jaribu tena.");
  if (!code) throw new Error("OTP si sahihi au imekwisha muda.");
  // Claim atomically; concurrent/replayed submissions cannot create or reset accounts.
  const { data: claimed, error: claimError } = await admin.from("otp_codes").update({ verified: true })
    .eq("id", code.id).eq("verified", false).gte("expires_at", now).select("id").maybeSingle();
  if (claimError || !claimed) throw new Error("OTP si sahihi au imeshatumika.");
  let createdId: string | undefined;
  try {
    const { data, error } = await admin.auth.admin.createUser({
      email: accountEmail(input.phone), password: input.password,
      // The phone was verified above; no global email auto-confirm setting is changed.
      email_confirm: true, user_metadata: { full_name: input.full_name ?? "" },
    });
    if (error || !data.user) {
      if (error?.code === "email_exists" || error?.message?.includes("already")) {
        throw new Error("Namba hii imesajiliwa tayari. Tafadhali ingia kwa password yako.");
      }
      if (error?.code === "weak_password") {
        throw new Error("Password hii ni rahisi kukisiwa au imeshavuja mtandaoni. Chagua password nyingine yenye herufi, namba na alama (mfano: Kanisa#2026Chuo).");
      }
      throw new Error("Imeshindwa kutengeneza akaunti. Tafadhali jaribu tena.");
    }
    createdId = data.user.id;
    const { error: profileError } = await admin.from("profiles").update({
      phone: input.phone, full_name: input.full_name ?? "",
      member_status: input.role === "student" ? "student" : "member",
    }).eq("id", createdId).select("id").single();
    if (profileError) throw new Error("Imeshindwa kuhifadhi taarifa za akaunti. Jaribu tena.");
    return createdId;
  } catch (error) {
    if (createdId) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(createdId);
      if (cleanupError) throw new Error("Akaunti imetengenezwa lakini taarifa hazijakamilika. Jaribu kuingia.");
    }
    // Failed creation leaves the code available for a retry within its original expiry.
    await admin.from("otp_codes").update({ verified: false }).eq("id", code.id);
    throw error;
  }
}