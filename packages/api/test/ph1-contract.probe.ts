import assert from "node:assert/strict";
import {
  createApiClient,
  ApiError,
  type ApiApplication,
} from "../src/transport";
import { authClients } from "../src/auth/auth.clients";
import { profileClients } from "../src/profile/profile.clients";
import { businessClients } from "../src/business/business.clients";
import { adminClients } from "../src/admin/admin.clients";
import { systemClients } from "../src/system/system.clients";

type Input = {
  clubId: string;
  branchId: string;
  coachId: string;
  ownerCookie: string;
  coachCookie: string;
  adminCookie: string;
  foreignClubId: string;
  image: string;
};
let stage = "setup";
async function main() {
  const baseUrl = process.env.PH1_CONTRACT_API_URL ?? "";
  assert.match(baseUrl, /^http:\/\/127\.0\.0\.1:\d+\/api\/v1$/);
  const input = JSON.parse(process.env.PH1_CONTRACT_INPUT ?? "{}") as Input;
  assert.ok(
    input.clubId &&
      input.branchId &&
      input.coachId &&
      input.ownerCookie &&
      input.coachCookie &&
      input.adminCookie,
  );
  const client = (
    application: ApiApplication,
    cookie: string,
    locale: "fa" | "en" = "en",
  ) =>
    createApiClient({
      application,
      locale,
      baseUrl,
      fetch: (url, init) => {
        const headers = new Headers(init?.headers);
        headers.set("Cookie", cookie);
        headers.set(
          "Origin",
          `http://localhost:${application === "business" ? 7083 : application === "admin" ? 7082 : 7081}`,
        );
        return fetch(url, { ...init, headers });
      },
    });
  const business = client("business", input.ownerCookie);
  const coach = client("application", input.coachCookie);
  const admin = client("admin", input.adminCookie);
  stage = "profile";
  const account = await profileClients.account(coach);
  assert.equal(account.id, input.coachId);
  assert.ok(
    (await authClients.sessions(coach)).some((session) => session.current),
  );
  assert.ok(Array.isArray((await profileClients.access(coach)).organizations));
  assert.ok(Array.isArray(await profileClients.invitations(coach)));
  const affiliations = await profileClients.affiliations(coach);
  assert.equal(affiliations.length, 101);
  assert.equal((await profileClients.affiliationPage(coach, 2)).length, 1);
  assert.ok(affiliations.every((item) => item.clubId === input.clubId));
  const updated = await profileClients.updateAccount(coach, {
    displayName: "مربی قرارداد واقعی",
  });
  assert.equal(updated.displayName, "مربی قرارداد واقعی");
  const policy = await systemClients.policy(coach);
  assert.ok(policy.version && policy.minimumAge > 0);
  assert.equal((await profileClients.privacy(coach)).acceptanceRequired, false);
  assert.equal(
    (await profileClients.updatePrivacy(coach, { marketingConsent: false }))
      .marketingConsent,
    false,
  );
  const exported = await profileClients.exportAccount(coach);
  assert.equal(exported.formatVersion, 2);
  assert.ok(!JSON.stringify(exported).includes("tokenHash"));
  assert.deepEqual(await profileClients.favorites(coach), []);
  assert.deepEqual(await profileClients.mergeFavorites(coach, []), []);
  await assert.rejects(
    profileClients.requestPhoneChange(coach, { phone: account.phone }),
    (error) => error instanceof ApiError && error.status === 409,
  );
  await assert.rejects(
    profileClients.verifyPhoneChange(coach, {
      challengeId: "invalid",
      code: "12345",
    }),
    (error) => error instanceof ApiError && error.status === 400,
  );
  assert.equal((await profileClients.account(coach)).id, account.id);

  stage = "branches";
  const club = await businessClients.club(business, input.clubId);
  assert.equal(club.branches.length, 101);
  assert.equal(
    (await businessClients.branches(business, input.clubId)).length,
    101,
  );
  assert.equal(
    (await businessClients.clubBranch(business, input.clubId, input.branchId))
      .id,
    input.branchId,
  );
  const team = await businessClients.team(business, input.clubId);
  assert.ok(
    team.members.some(
      (member) => member.userId === club.ownerId && member.role === "owner",
    ),
  );
  stage = "tariffs";
  const tariff = {
    name: "تعرفهٔ قرارداد",
    serviceType: "membership" as const,
    priceToman: 100000,
    unit: "month" as const,
    durationDays: 30,
    conditions: "شرایط قرارداد",
  };
  const original = await businessClients.createTariff(
    business,
    input.clubId,
    tariff,
  );
  const revised = await businessClients.reviseTariff(
    business,
    input.clubId,
    original.id,
    { ...tariff, priceToman: 120000, reason: "بازنگری برای آزمون قرارداد" },
  );
  assert.equal(revised.version, 2);
  assert.equal(revised.priceToman, 120000);
  assert.equal(
    (await businessClients.tariffHistory(business, input.clubId, original.id))
      .length,
    2,
  );
  assert.ok(
    (await businessClients.tariffs(business, input.clubId)).some(
      (item) => item.id === original.id,
    ),
  );
  assert.equal(
    (
      await businessClients.setTariffStatus(
        business,
        input.clubId,
        original.id,
        { isActive: false, reason: "آزمون تغییر وضعیت قرارداد" },
      )
    ).isActive,
    false,
  );
  stage = "media";
  const media = await businessClients.uploadMedia(business, input.clubId, {
    file: new File(
      [new Uint8Array(Buffer.from(input.image, "base64"))],
      "contract.png",
      { type: "image/png" },
    ),
    alt: "تصویر قرارداد",
  });
  assert.equal(media.type, "image");
  assert.equal(media.width, 4);
  const preview = await businessClients.mediaPreview(
    business,
    input.clubId,
    media.id,
  );
  const adminPreview = await adminClients.mediaPreview(
    admin,
    input.clubId,
    media.id,
  );
  assert.equal(preview.expiresIn, 60);
  assert.equal(adminPreview.expiresIn, 60);
  assert.equal(new URL(preview.url).hostname, "127.0.0.1");
  const image = await fetch(preview.url);
  assert.equal(image.status, 200);
  assert.ok((await image.arrayBuffer()).byteLength > 0);
  assert.equal(
    (await businessClients.deleteMedia(business, input.clubId, media.id))
      .success,
    true,
  );
  await assert.rejects(
    businessClients.mediaPreview(business, input.clubId, media.id),
    (error) => error instanceof ApiError && error.status === 404,
  );

  stage = "localized-errors";
  let previous: { code: string; message: string } | undefined;
  for (const locale of ["fa", "en"] as const) {
    try {
      await businessClients.updateClub(
        client("business", input.ownerCookie, locale),
        input.clubId,
        { name: "x" },
      );
      assert.fail("Invalid name unexpectedly accepted");
    } catch (error) {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      const details = error.details as {
        code: string;
        message: string;
        fields: { path: string; message: string }[];
      };
      assert.ok(details.fields.some((field) => field.path === "name"));
      assert.ok(!details.message.startsWith("Backend."));
      if (previous) {
        assert.equal(details.code, previous.code);
        assert.notEqual(details.message, previous.message);
      }
      previous = details;
    }
  }
  await assert.rejects(
    businessClients.club(business, input.foreignClubId),
    (error) => error instanceof ApiError && error.status === 403,
  );
  stage = "admin";
  assert.equal(
    (await adminClients.club(admin, input.clubId)).branches.length,
    101,
  );
  assert.equal(
    (await adminClients.branch(admin, input.clubId, input.branchId)).id,
    input.branchId,
  );
  assert.equal(
    (await adminClients.user(admin, input.coachId)).id,
    input.coachId,
  );
  assert.equal(
    (await adminClients.organization(admin, input.clubId)).id,
    input.clubId,
  );
  assert.equal(typeof (await adminClients.overview(admin)).users, "number");
  assert.ok(
    (await adminClients.audit(admin, { organizationId: input.clubId })).some(
      (event) => event.action === "tariff.revised",
    ),
  );
  await assert.rejects(
    adminClients.overview(business),
    (error) => error instanceof ApiError && error.status === 403,
  );
  process.stdout.write(
    JSON.stringify({
      branches: club.branches.length,
      affiliations: affiliations.length,
      media: "uploaded-previewed-deleted",
      tariffs: "created-revised-status",
      errors: "fa-en-validated",
      profile: "privacy-phone-favorites",
      admin: "authorized",
    }),
  );
}
void main().catch((error: unknown) => {
  process.stderr.write(
    JSON.stringify({
      stage,
      error: error instanceof ApiError ? error.code : "assertion-or-runtime",
      ...(error instanceof ApiError ? { status: error.status } : {}),
    }),
  );
  process.exitCode = 1;
});
