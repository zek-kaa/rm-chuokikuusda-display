import { describe, it, expect, vi } from "vitest";
import { completeAccountSignup } from "./account.server";
import type { SupabaseClient } from "@supabase/supabase-js";

function fixture(valid: boolean, creationFails = false, claimAvailable = true, creationError: Record<string, string> = { message: "Database error" }) {
  const calls: Array<{ table: string; operation: string; value?: unknown }> = [];
  let lookup = 0;
  const admin = {
    from(table: string) {
      let operation = "select";
      const chain = {
        select() { return chain; }, eq() { return chain; }, gte() { return chain; }, order() { return chain; }, limit() { return chain; },
        update(value: unknown) { operation = "update"; calls.push({ table, operation, value }); return chain; },
        maybeSingle: async () => ({ data: (++lookup === 1 ? valid : claimAvailable) ? { id: "code" } : null, error: null }),
        single: async () => ({ data: { id: "new-account" }, error: null }),
        then(resolve: (value: unknown) => void) { resolve({ error: null }); },
      };
      return chain;
    },
    auth: { admin: {
      createUser: vi.fn(async (_attributes: unknown) => ({ data: { user: creationFails ? null : { id: "new-account" } }, error: creationFails ? creationError : null })),
      deleteUser: vi.fn(async () => ({ error: null })),
    } },
  };
  return { admin, calls, client: admin as unknown as SupabaseClient };
}
const input = { phone: "255700000001", otp: "123456", password: "strong-password", full_name: "Signup Test" };
describe("account creation after OTP", () => {
  it("never creates an account for an invalid or expired OTP", async () => {
    const f = fixture(false);
    await expect(completeAccountSignup(f.client, input)).rejects.toThrow("OTP si sahihi");
    expect(f.admin.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it("saves the password in Cloud Auth and the profile under the same account ID", async () => {
    const f = fixture(true);
    await expect(completeAccountSignup(f.client, input)).resolves.toBe("new-account");
    expect(f.admin.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({ password: "strong-password", email: "255700000001@phone.chuokikuu.invalid", email_confirm: true }));
    expect(f.calls).toContainEqual({ table: "profiles", operation: "update", value: { phone: input.phone, full_name: "Signup Test", member_status: "member" } });
  });
  it("prevents a replayed or concurrently claimed OTP from creating an account", async () => {
    const f = fixture(true, false, false);
    await expect(completeAccountSignup(f.client, input)).rejects.toThrow("imeshatumika");
    expect(f.admin.auth.admin.createUser).not.toHaveBeenCalled();
  });
  it("allows retrying the unexpired code when account creation fails", async () => {
    const f = fixture(true, true);
    await expect(completeAccountSignup(f.client, input)).rejects.toThrow("kutengeneza akaunti");
    expect(f.calls).toContainEqual({ table: "otp_codes", operation: "update", value: { verified: false } });
  });
  it("tells the user when the password is rejected as weak or leaked", async () => {
    const f = fixture(true, true, true, { code: "weak_password", message: "Password is known to be weak" });
    await expect(completeAccountSignup(f.client, input)).rejects.toThrow("Chagua password nyingine");
  });
  it("does not grant privileged access requested by signup", async () => {
    const f = fixture(true);
    await completeAccountSignup(f.client, { ...input, role: "super_admin" });
    expect(f.calls.some(call => call.table.includes("roles"))).toBe(false);
    expect(f.admin.auth.admin.createUser.mock.calls[0]?.[0]).not.toHaveProperty("user_metadata.role");
  });
});