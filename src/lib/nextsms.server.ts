// Server-only NextSMS client. Credentials never reach the browser.
export async function sendNextSms(to: string, text: string) {
  const auth = process.env["NEXTSMS_AUTH_TOKEN"];
  const from = process.env["NEXTSMS_SENDER_ID"];
  if (!auth || !from) throw new Error("NextSMS is not configured");
  const res = await fetch("https://messaging-service.co.tz/api/sms/v1/text/single", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ from, to: to.replace(/^\+/, ""), text }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`NextSMS failed [${res.status}]: ${body}`);
  return body;
}
