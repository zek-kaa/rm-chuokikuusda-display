import { createSupabaseClient } from "@/lib/supabase/client";
import { requestSignupOtp, confirmSignupOtp } from "@/lib/sms.functions";
import { signupAccount, passwordAccountProfile } from "@/lib/account.functions";

export interface AuthUser {
  id: string;
  phone: string;
  full_name: string;
  role: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at: string;
  user_id: string;
  user: AuthUser;
}

const AUTH_STORAGE_KEY = "auth_session";

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "255" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("255")) {
    cleaned = "255" + cleaned;
  }
  return cleaned;
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("storage"));
}

export function getSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (new Date(session.expires_at) < new Date()) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  void createSupabaseClient().auth.signOut();
  window.dispatchEvent(new Event("storage"));
}

// Helper: race a promise against a timeout so the UI doesn't hang on slow/cold edge functions
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} imechukua muda mrefu. Tafadhali jaribu tena.`)),
        ms
      )
    ),
  ]);
}

async function getFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const response = (error as { context?: Response })?.context;
  if (response) {
    try {
      const body = await response.clone().json();
      if (typeof body?.error === "string") return body.error;
      if (typeof body?.message === "string") return body.message;
    } catch {
      // Fall through to the SDK error message.
    }
  }
  const message = (error as Error)?.message;
  return message && message !== "Edge Function returned a non-2xx status code" ? message : fallback;
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return "Password lazima iwe na herufi 8 au zaidi";
  if (password.length > 128) return "Password isizidi herufi 128";
  if (password !== confirmation) return "Password hazilingani";
  return null;
}

export async function signIn(phone: string, password: string): Promise<AuthSession> {
  const client = createSupabaseClient();
  const { data, error } = await withTimeout(
    client.auth.signInWithPassword({ email: `${normalizePhone(phone)}@phone.chuokikuu.invalid`, password }),
    10000,
    "Kuingia"
  );

  if (error || !data.session) throw new Error(error?.code === "invalid_credentials" ? "Namba ya simu au password si sahihi." : await getFunctionErrorMessage(error, "Imeshindwa kuingia"));
  const user = await passwordAccountProfile({ data: { access_token: data.session.access_token } });

  const session: AuthSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: new Date((data.session.expires_at ?? 0) * 1000).toISOString(),
    user_id: user.id,
    user,
  };

  saveSession(session);
  return session;
}

export async function sendOtp(phone: string, full_name?: string, role?: string) {
  const data = await withTimeout(
    requestSignupOtp({ data: { phone, full_name, role } }),
    15000,
    "Kutuma OTP"
  );

  if (!data?.success) throw new Error(data?.error || "Failed to send OTP");
  return data;
}

export async function verifyOtp(
  phone: string,
  otp: string,
  password: string,
  full_name?: string,
  role?: string,
): Promise<AuthSession> {
  await withTimeout(
    signupAccount({ data: { phone, otp, password, full_name, role } }),
    15000,
    "Kuthibitisha OTP"
  );

  return signIn(phone, password);
}

export async function confirmOtp(phone: string, otp: string): Promise<void> {
  const result = await withTimeout(confirmSignupOtp({ data: { phone, otp } }), 15000, "Kuthibitisha OTP");
  if (!result.success) throw new Error(result.error || "OTP si sahihi au imekwisha muda.");
}
