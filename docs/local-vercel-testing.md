# Local frontend testing with the deployed API

The local frontends can use `https://gym4me-demo-api.vercel.app` without
starting NestJS, PostgreSQL, or storage on the laptop. Put this in the relevant
app's ignored `.env.local` file:

```dotenv
API_URL=https://gym4me-demo-api.vercel.app
```

This is configured locally for `apps/admin`, `apps/application`, `apps/business`,
and `apps/website`. The browser uses the app's existing `/api` proxy; server-side
requests go to Vercel. Restart the frontend after changing its environment.

Start only the frontend you want to test, for example:

```sh
pnpm --filter admin dev
```

Open `http://localhost:7082`. Application uses `http://localhost:7081` and
business uses `http://localhost:7083`. Use these exact hosts and ports for
authenticated requests to the shared demo.

The demo API has `DEMO_LOCAL_WEB_ENABLED=true` in its production environment.
The flag defaults to false, requires `DEMO_MODE=true`, and admits only each
surface's matching localhost port. Existing deployed origins and session/role
checks still apply. Remove or disable the flag to revoke local access.

Testing uses the shared deployed backend and its current SMS and payment
providers. The deployment on 2026-10-25 retains Kavenegar SMS and Saman BankTest;
the historical fixed demo OTP is not active while live SMS is selected.
