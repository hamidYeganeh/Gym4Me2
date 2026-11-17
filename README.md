# Gym4Me

## Local setup

Use the Node.js version in `.nvmrc` and the npm version in `package.json`. Install Docker with Compose and the PostgreSQL `psql` client for the database-backed flows.

```sh
npm ci
cp -n .env.example .env
```

Set `AUTH_SECRET` in `.env` to a local secret generated with `openssl rand -hex 32`. From the repository root, load the environment and start PostgreSQL:

```sh
set -a
. ./.env
set +a
docker compose -f compose.dev.yaml up -d --wait
```

Apply the migrations and provision an administrator using the [club onboarding guide](docs/club-onboarding.md). In the terminal where you loaded `.env`, start `npm run dev --workspace backend`. From separate terminals at the repository root, run `npm run dev --workspace application`, `npm run dev --workspace admin`, and `npm run dev --workspace business`. The example configuration uses console OTP for local sign-in. Gallery uploads require the storage configuration described in the guide.

| Workspace         | Purpose                               | Local URL             |
| ----------------- | ------------------------------------- | --------------------- |
| `application`     | Training app and Capacitor web bundle | http://localhost:3000 |
| `admin`           | Platform administration               | http://localhost:3001 |
| `business`        | Gym management                        | http://localhost:3002 |
| `backend`         | NestJS API                            | http://localhost:3003 |
| `@repo/storybook` | Shared UI and theme                   | http://localhost:6006 |

Run `npm run check`, `npm test`, and `npm run build` from the root. To run an app by itself, use `npm run dev --workspace application` and substitute the workspace name as needed.

The frontend route groups in `app/` call views in `features/<feature>/views/`. Views compose named sections from `features/<feature>/sections/`. The three frontends load the semantic dark and lime palette from `@repo/theme`. Shared components live in `@repo/ui`.

## iOS and Android

The web application runs with Next.js so published clubs can open at `/clubs/:clubId`. Run the production web build with `npm run start --workspace application`. The native build exports static files to `apps/application/out`, which Capacitor copies into the native projects. The bundle identifier is `com.gym4me.app`.

The iOS and Android projects are included in the workspace. Use the `native:add:ios` or `native:add:android` script only if you need to regenerate a platform directory.

Rebuild and sync after web changes, then open the platform project:

```sh
npm run native:sync --workspace application
npm run native:open:ios --workspace application
npm run native:open:android --workspace application
```

Use Xcode or Android Studio to run on a device and configure signing for release. See the [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup) for platform prerequisites.
