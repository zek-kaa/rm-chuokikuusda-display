import { describe, it, expect } from "vitest";
import { normalizeTzPhone, splitAmount, receiptSms } from "./format";
describe("rm rules", () => {
  it("normalizes 07 numbers to 2557", () => expect(normalizeTzPhone("0752519974")).toBe("255752519974"));
  it("rejects invalid phones", () => expect(normalizeTzPhone("12345")).toBeNull());
  it("Sadaka 50/50 split", () => expect(splitAmount(10000, 50)).toEqual({ local: 5000, conference: 5000 }));
  it("Zaka goes 100% to conference", () => expect(splitAmount(50000, 0)).toEqual({ local: 0, conference: 50000 }));
  it("SMS contains total and receipt", () => {
    const s = receiptSms("Juma", "2026-11-19", [{ code: "RM", amount: 20000 }, { code: "ZAKA", amount: 50000 }], 70000, "RM-2026-00001");
    expect(s).toContain("Jumla: TZS 70,000/=");
    expect(s).toContain("Risiti Na: RM-2026-00001");
  });
});
