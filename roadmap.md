# Tasks

- [x] Repair missing browser Cloud configuration preventing password submission; real drawer submission now reaches the signup service and reports the separate existing account-creation failure.

- [x] Correct the website and installed-app OTP forms shown in the screenshot: verified OTP-only entry and password drawer after real OTP confirmation on desktop and mobile.

- [x] Show password creation and confirmation in a drawer only after OTP confirmation; verified valid and invalid OTPs on desktop and mobile.
- [x] Verify direct NextSMS in the new workspace; existing credentials remain available and the official balance check returned HTTP 200.

- [x] Connect NextSMS in the new workspace.
- [x] Finish reviewing authentication error handling on the website, sign-in page and installed app.
- [x] Report remaining signup and sign-in blockers without changing existing permissions or settled records.
- [x] Integrate SMS directly with NextSMS Basic authentication, without connectors; NextSMS accepted the test SMS through the signup form to the user-approved number.
- [x] Repair account creation and password sign-in against existing Cloud accounts without changing forms; verified real OTP confirmation, password saving, dashboard entry, logout, repeat password login and reload. SMS delivery was suppressed for test-only numbers; 21 tests passed.
- [x] Sweep signup rule across website, /auth, installed-app gate, shared drawer, resend, OTP confirmation, account creation, password sign-in and profile-creation trigger. All active signup callers use the repaired shared service; /auth and installed-app paths were source-checked, not separately run. Imported send-otp, verify-otp and sign-in Edge function files still use legacy flows but have no callers in app source; left unchanged under user's scope restriction. No signup background jobs found in app source or supplied database function inventory.