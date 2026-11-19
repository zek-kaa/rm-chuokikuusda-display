import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const phone = z.string().transform(value => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `255${digits.slice(1)}` : digits.startsWith("255") ? digits : `255${digits}`;
}).pipe(z.string().regex(/^255[67]\d{8}$/));
const credentials = z.object({ phone, password: z.string().min(8).max(128) });
const signup = credentials.extend({ otp: z.string().regex(/^\d{6}$/), full_name: z.string().trim().max(200).optional(), role: z.string().max(30).optional() });

export const signupAccount = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof signup>) => signup.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { completeAccountSignup } = await import("./account.server");
    await completeAccountSignup(supabaseAdmin, data);
    return { success: true };
  });

export const passwordAccountProfile = createServerFn({ method: "POST" })
  .inputValidator((input: { access_token: string }) => z.object({ access_token: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const { createAccountAuthClient } = await import("./account.server");
    const client = createAccountAuthClient(process.env["SUPABASE_URL"] ?? "", process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "");
    const { data: auth, error } = await client.auth.getUser(data.access_token);
    if (error || !auth.user) throw new Error("Tafadhali ingia tena.");
    // Use the validated user's JWT for normal profile/role reads, never service access.
    const { createClient } = await import("@supabase/supabase-js");
    const scoped = createClient(process.env["SUPABASE_URL"] ?? "", process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "", {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${data.access_token}` } },
    });
    const { data: profile, error: profileError } = await scoped.from("profiles").select("id,phone,full_name,active").eq("id", auth.user.id).single();
    if (profileError || !profile?.active) throw new Error("Akaunti hii haipatikani au haijaruhusiwa kuingia.");
    const { data: roles } = await scoped.from("rbac_user_roles").select("role_key").eq("user_id", auth.user.id);
    return { id: profile.id, phone: profile.phone, full_name: profile.full_name, role: roles?.[0]?.role_key ?? "member" };
  });