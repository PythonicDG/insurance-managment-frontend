# Security

Send security reports privately to the repository administrators through the existing project contact
channel. Include the affected commit, reproduction and impact using synthetic data.
Keep credentials and customer records out of public issues.

NEXT_PUBLIC_API_URL is browser-visible. The frontend must not contain database, SMTP or Meta credentials.
Serve the application over HTTPS and configure the backend to allow only the intended frontend origins.

Authentication uses the backend HttpOnly cookie, with legacy tab-scoped token support. A 401 response
clears browser state and returns to login. Closing a tab is not a substitute for server-side token
revocation; use explicit logout when ending a session.

The CI dependency audit fails on high/critical advisories. For security updates, change dependencies
and the lockfile in the repository, verify the build and deploy with npm ci.
Backend authorization, token lifetime and uploaded-document controls are described in the
[backend security guide](https://github.com/PythonicDG/insurance-managment-backend/blob/master/SECURITY.md).
