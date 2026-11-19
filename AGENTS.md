 # Project architecture

- Keep OTP codes service-only with RLS and no browser grants; signup codes must not be exposed through the public Data API.
- Extract authentication error messages from function response bodies so users receive the actual failure rather than an SDK status message.
- Signup SMS uses a TanStack server function and a server-only NextSMS client; credentials remain server-side and private OTP storage stays compatible with the imported verification flow.
- Password creation opens in a controlled drawer after a server-side OTP check; the final signup operation must revalidate and consume the code to prevent bypassing verification.
- Website and installed-app signup popups share SignupPasswordDrawer so their OTP screens cannot drift into displaying password fields before confirmation.
- Normalize generated browser Cloud environment reads to dot notation in the Vite transform so the preview bundler injects public configuration without editing generated integration files.
- Signup creates Cloud Auth accounts only after an atomic private OTP claim, maps profiles by auth ID, and stores passwords in Cloud Auth; never recreate the imported custom credential/token tables or assign privileged roles from phone numbers.
- Phone/password accounts use a deterministic internal email after SMS verification; user sign-in and privileged account creation use separate clients to preserve service identity, and the browser persists real access/refresh sessions.
<!-- AGENT-MEMORY:BEGIN -->
- Treasurer system lives under /rm (staff roles in user_roles: head_treasurer, assistant_treasurer, auditor; super_admin acts as head) and public giving at /give; offerings are written only via record_offering RPC so splits and receipt numbers stay atomic. Existing member pages stay untouched.
<!-- AGENT-MEMORY:END -->
