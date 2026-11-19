import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const otpRequest = z.object({
  phone: z.string().trim().min(9).max(20),
  full_name: z.string().trim().max(200).optional(),
  role: z.string().max(30).optional(),
});

// Check the supplied code without consuming it; final signup revalidates and consumes it.
export const confirmSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; otp: string }) => z.object({
    phone: z.string().trim().min(9).max(20),
    otp: z.string().regex(/^\d{6}$/),
  }).parse(input))
  .handler(async ({ data }) => {
    const digits = data.phone.replace(/\D/g, "");
    const phone = digits.startsWith("0") ? `255${digits.slice(1)}`
      : digits.startsWith("255") ? digits : `255${digits}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: record, error } = await supabaseAdmin.from("otp_codes")
      .select("id")
      .eq("phone", phone).eq("otp", data.otp).eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return { success: false, error: "Imeshindwa kuthibitisha OTP. Tafadhali jaribu tena." };
    if (!record) return { success: false, error: "OTP si sahihi au imekwisha muda." };
    return { success: true };
  });

// Public signup operation: only generates an OTP message, never arbitrary SMS.
export const requestSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((input: z.input<typeof otpRequest>) => otpRequest.parse(input))
  .handler(async ({ data }) => {
    const digits = data.phone.replace(/\D/g, "");
    const phone = digits.startsWith("0")
      ? `255${digits.slice(1)}`
      : digits.startsWith("255") ? digits : `255${digits}`;
    if (!/^255[67]\d{8}$/.test(phone)) {
      return { success: false, error: "Tafadhali ingiza namba halali ya simu ya Tanzania." };
    }
    const credentials = {
      username: process.env["NEXTSMS_USERNAME"] ?? "",
      password: process.env["NEXTSMS_PASSWORD"] ?? "",
      senderId: process.env["NEXTSMS_SENDER_ID"] ?? "",
    };
    const { nextSmsHeaders, sendNextSms } = await import("./nextsms.server");
    try {
      nextSmsHeaders(credentials);
      // OTPs are private service-only records; no browser can read their values.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count, error: countError } = await supabaseAdmin
        .from("otp_codes")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone)
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
      if (countError) throw new Error("Imeshindwa kukagua maombi ya OTP. Tafadhali jaribu tena.");
      // Preserve the imported sender's existing five requests / five minutes rule.
      if ((count ?? 0) >= 5) {
        return { success: false, error: "Too many OTP requests. Try again in 5 minutes." };
      }
      const random = crypto.getRandomValues(new Uint32Array(1))[0];
      const otp = String(100000 + ((random ?? 0) % 900000));
      const { data: record, error: insertError } = await supabaseAdmin
        .from("otp_codes")
        .insert({ phone, otp, verified: false })
        .select("id")
        .single();
      if (insertError || !record) throw new Error("Failed to generate OTP");
      try {
        await sendNextSms(credentials, phone, `Your OTP code is: ${otp}. Itaisha muda baada ya dakika 5.`);
      } catch (error) {
        // Failed delivery codes cannot subsequently be used for signup.
        await supabaseAdmin.from("otp_codes").update({ verified: true }).eq("id", record.id);
        throw error;
      }
      return { success: true, message: "OTP sent successfully", phone };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Imeshindwa kutuma SMS. Tafadhali jaribu tena.",
      };
    }
  });