export const NEXTSMS_BASE_URL = "https://messaging-service.co.tz/api/sms/v1";

export interface NextSmsCredentials {
  username: string;
  password: string;
  senderId: string;
}

// Credentials may be stored either as separate username/password secrets or as
// a single NEXTSMS_AUTH_TOKEN holding Base64 of "username:password".
export function resolveNextSmsCredentials(env: Record<string, string | undefined>): NextSmsCredentials {
  let username = env["NEXTSMS_USERNAME"] ?? "";
  let password = env["NEXTSMS_PASSWORD"] ?? "";
  const token = env["NEXTSMS_AUTH_TOKEN"] ?? "";
  if ((!username || !password) && token) {
    try {
      const decoded = atob(token);
      const separator = decoded.indexOf(":");
      if (separator > 0) {
        username = username || decoded.slice(0, separator);
        password = password || decoded.slice(separator + 1);
      }
    } catch {
      // Invalid token; leave credentials empty so the caller reports missing config.
    }
  }
  return { username, password, senderId: env["NEXTSMS_SENDER_ID"] ?? "" };
}

export function nextSmsHeaders(credentials: NextSmsCredentials): Headers {
  if (!credentials.username || !credentials.password || !credentials.senderId) {
    throw new Error("Taarifa za NextSMS hazijakamilika: username, password na Sender ID zinahitajika.");
  }
  const bytes = new TextEncoder().encode(`${credentials.username}:${credentials.password}`);
  const encoded = btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
  return new Headers({
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  });
}

export async function sendNextSms(
  credentials: NextSmsCredentials,
  phone: string,
  text: string,
  request: typeof fetch = fetch,
): Promise<{ messageId: string }> {
  const response = await request(`${NEXTSMS_BASE_URL}/text/single`, {
    method: "POST",
    headers: nextSmsHeaders(credentials),
    body: JSON.stringify({ from: credentials.senderId, to: phone, text }),
    signal: AbortSignal.timeout(10000),
    redirect: "manual",
  });
  const raw = await response.text();
  if (!response.ok) {
    // Do not log full responses: they can echo the recipient and OTP.
    console.error("NextSMS HTTP failure", response.status);
    throw new Error(`NextSMS imeshindwa kutuma SMS (HTTP ${response.status}). Angalia taarifa za akaunti, salio na Sender ID.`);
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new Error("NextSMS imerudisha jibu lisiloeleweka; SMS haijathibitishwa kutumwa.");
  }
  const message = body?.messages?.[0];
  const group = message?.status?.groupName;
  if (!message?.messageId || !["PENDING", "ACCEPTED", "DELIVERED"].includes(group)) {
    // Only allow provider status identifiers, never arbitrary response text.
    const statusName = String(message?.status?.name ?? "UNKNOWN");
    const safeStatus = /^[A-Z_]+$/.test(statusName) ? statusName : "UNKNOWN";
    throw new Error(`NextSMS imekataa SMS (${safeStatus}). Angalia salio, namba ya simu na Sender ID.`);
  }
  return { messageId: message.messageId };
}