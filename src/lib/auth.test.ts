import { describe, expect, it, vi } from "vitest";
import { sendOtp, signIn, verifyOtp, confirmOtp, validateNewPassword } from "./auth";

const { signInWithPassword, signupAccount, passwordAccountProfile, requestSignupOtp, confirmSignupOtp } = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signupAccount: vi.fn(), passwordAccountProfile: vi.fn(), requestSignupOtp: vi.fn(), confirmSignupOtp: vi.fn() }));
vi.mock("@/lib/sms.functions", () => ({ requestSignupOtp, confirmSignupOtp }));
vi.mock("@/lib/account.functions", () => ({ signupAccount, passwordAccountProfile }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseClient: () => ({ auth: { signInWithPassword } }),
}));

describe("sendOtp", () => {
  it("returns the service's error instead of the generic non-2xx error", async () => {
    requestSignupOtp.mockResolvedValueOnce({ success: false, error: "Failed to generate OTP" });
    await expect(sendOtp("0712345678")).rejects.toThrow("Failed to generate OTP");
  });
});

describe("OTP confirmation before password creation", () => {
  it("rejects an invalid code before the password step", async () => {
    confirmSignupOtp.mockResolvedValueOnce({ success: false, error: "OTP si sahihi au imekwisha muda." });
    await expect(confirmOtp("0712345678", "000000")).rejects.toThrow("OTP si sahihi au imekwisha muda.");
  });
  it("accepts a confirmed code without submitting a password or creating a session", async () => {
    confirmSignupOtp.mockResolvedValueOnce({ success: true });
    await expect(confirmOtp("0712345678", "123456")).resolves.toBeUndefined();
    expect(confirmSignupOtp).toHaveBeenLastCalledWith({ data: { phone: "0712345678", otp: "123456" } });
  });
});

describe("authentication service failures", () => {
  it("preserves password sign-in failures", async () => {
    signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: { code: "invalid_credentials" } });
    await expect(signIn("0712345678", "wrong-password")).rejects.toThrow("Namba ya simu au password si sahihi.");
  });

  it("preserves OTP verification failures", async () => {
    signupAccount.mockRejectedValueOnce(new Error("Invalid or expired OTP"));
    await expect(verifyOtp("0712345678", "000000", "salama123")).rejects.toThrow("Invalid or expired OTP");
  });

  it("uses the operation fallback when the service returns no readable reason", async () => {
    requestSignupOtp.mockResolvedValueOnce({ success: false });
    await expect(sendOtp("0712345678")).rejects.toThrow("Failed to send OTP");
  });
});

describe("validateNewPassword", () => {
  it("rejects passwords shorter than 8 characters", () => {
    expect(validateNewPassword("1234567", "1234567")).toBe(
      "Password lazima iwe na herufi 8 au zaidi",
    );
  });

  it("accepts a matching password of exactly 8 characters", () => {
    expect(validateNewPassword("12345678", "12345678")).toBeNull();
  });

  it("rejects passwords longer than 128 characters", () => {
    const password = "a".repeat(129);
    expect(validateNewPassword(password, password)).toBe("Password isizidi herufi 128");
  });

  it("rejects a confirmation that does not match", () => {
    expect(validateNewPassword("salama123", "salama124")).toBe("Password hazilingani");
  });
});
