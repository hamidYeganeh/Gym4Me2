import { readFile, mkdir, writeFile } from "node:fs/promises";
import { publicServiceFixtures } from "../test/fixtures/public-services";
import { checkoutMembershipFixtures } from "../test/fixtures/checkout-memberships";
import { documentFixtures } from "../test/fixtures/documents";
import { invitationFixtures } from "../test/fixtures/invitations";
import { notificationFixtures } from "../test/fixtures/notifications";
import { conversationFixtures } from "../test/fixtures/conversations";
import { supportFixtures } from "../test/fixtures/support";
import {
  webReadServer,
  type WebReadScenario,
} from "../test/fixtures/web-read-api";

if (process.env.GYM_WEB_READ_FIXTURE !== "true")
  throw new Error("Explicit GYM_WEB_READ_FIXTURE=true is required.");
const scenario = process.env.WEB_READ_SCENARIO ?? "populated";
if (
  ![
    "populated",
    "empty",
    "unavailable",
    "slow",
    "missing-image",
    "checkout-read",
    "checkout-read-error",
    "documents-read",
    "documents-read-error",
    "session-expired",
    "privacy-read",
    "preferences-read",
    "preferences-refresh",
    "preferences-refresh-error",
    "invitations-read",
    "invitations-empty",
    "invitations-page-error",
    "invitations-last-empty",
    "notifications-read",
    "notifications-empty",
    "notifications-page-error",
    "notifications-last-empty",
    "notifications-forbidden",
    "conversations-read",
    "conversations-empty",
    "conversations-page-error",
    "conversations-last-empty",
    "conversations-forbidden",
    "support-read",
    "support-empty",
    "support-forbidden",
    "support-unavailable",
    "calendars-read",
    "calendars-empty",
    "calendars-page-error",
    "calendars-last-empty",
    "calendars-forbidden",
    "calendars-page-forbidden",
    "calendars-slow",
    "protected-catalog",
    "ph0-public",
  ].includes(scenario)
)
  throw new Error("Unsupported read-only web fixture scenario.");
const port = Number(process.env.WEB_READ_PORT ?? 7488);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid local fixture port.");
const services = publicServiceFixtures();
const image = await readFile(
  new URL("../public/images/clubs/studio.png", import.meta.url),
);
const server = webReadServer({
  services,
  memberships: checkoutMembershipFixtures(services),
  documents: documentFixtures(),
  invitations: invitationFixtures(),
  notifications: notificationFixtures(),
  conversations: conversationFixtures(),
  tickets: supportFixtures(),
  image,
  scenario: scenario as WebReadScenario,
});
await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(port, "127.0.0.1", resolve);
});
const artifact = new URL(
  "../../../.artifacts/public-services-web-2026-10-17/",
  import.meta.url,
);
await mkdir(artifact, { recursive: true, mode: 0o700 });
await writeFile(
  new URL("fixture.json", artifact),
  JSON.stringify(
    {
      readonly: true,
      port,
      scenario,
      services: services.map(({ id, title, kind }) => ({ id, title, kind })),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `READ-ONLY WEB FIXTURE: http://127.0.0.1:${port}; ${scenario}; no accounts, orders or payments.`,
);
let closing = false;
const stop = () => {
  if (closing) return;
  closing = true;
  server.close();
  // A proxy may keep a busy socket alive across scenario replacements.
  // This process serves disposable read-only DTOs, so drain all of its sockets.
  server.closeAllConnections();
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
