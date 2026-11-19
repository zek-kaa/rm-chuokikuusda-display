import { describe, expect, it, vi } from "vitest";
import { nextSmsHeaders, sendNextSms, NEXTSMS_BASE_URL } from "./nextsms.server";

// Dummy credentials only; never use real account values in tests.
const credentials = { username: "test-user", password: "test-password", senderId: "TEST" };

describe("direct NextSMS integration", () => {
  it("uses Basic authentication with Base64 of username:password", () => {
    expect(nextSmsHeaders(credentials).get("Authorization")).toBe(`Basic ${btoa("test-user:test-password")}`);
  });
  it("sends directly to NextSMS with the configured sender and recipient", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      messages: [{ messageId: "test-id", status: { groupName: "PENDING" } }],
    })));
    await expect(sendNextSms(credentials, "255712345678", "Test message", request)).resolves.toEqual({ messageId: "test-id" });
    expect(request).toHaveBeenCalledWith(`${NEXTSMS_BASE_URL}/text/single`, expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ from: "TEST", to: "255712345678", text: "Test message" }),
    }));
  });
  it("rejects an HTTP 200 response containing a rejected message", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      messages: [{ messageId: "test-id", status: { groupName: "REJECTED", name: "REJECTED_SENDER" } }],
    })));
    await expect(sendNextSms(credentials, "255712345678", "Test", request)).rejects.toThrow("REJECTED_SENDER");
  });
  it("does not treat malformed or empty responses as delivery success", async () => {
    for (const body of ["not-json", "{}", '{"messages":[]}']) {
      await expect(sendNextSms(credentials, "255712345678", "Test", vi.fn().mockResolvedValue(new Response(body)))).rejects.toThrow();
    }
  });
  it("preserves HTTP failure status without exposing message contents", async () => {
    const request = vi.fn().mockResolvedValue(new Response("private message", { status: 401 }));
    await expect(sendNextSms(credentials, "255712345678", "Test", request)).rejects.toThrow("HTTP 401");
  });
  it("never sends without complete credentials", async () => {
    const request = vi.fn();
    await expect(sendNextSms({ ...credentials, password: "" }, "255712345678", "Test", request)).rejects.toThrow("hazijakamilika");
    expect(request).not.toHaveBeenCalled();
  });
});