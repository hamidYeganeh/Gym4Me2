import assert from "node:assert/strict";
import test from "node:test";
import {
  createApiClient,
  type ApiClient,
  type ApiApplication,
} from "../src/transport";
import { profileClients } from "../src/profile/profile.clients";
import { businessClients } from "../src/business/business.clients";
import { adminClients } from "../src/admin/admin.clients";
import { systemClients } from "../src/system/system.clients";

const tariff = {
  name: "طرح",
  serviceType: "membership" as const,
  unit: "month" as const,
  priceToman: 0,
  conditions: "رایگان",
};
type Case = {
  name: string;
  application: ApiApplication;
  run: (api: ApiClient) => Promise<unknown>;
  method: string;
  path: string;
  body?: unknown;
};
const cases: Case[] = [
  {
    name: "favorites",
    application: "application",
    run: (api) => profileClients.favorites(api),
    method: "GET",
    path: "profile/favorites",
  },
  {
    name: "favorite false and escaped id",
    application: "application",
    run: (api) => profileClients.setFavorite(api, "club/id", { saved: false }),
    method: "POST",
    path: "profile/favorites/club%2Fid",
    body: { saved: false },
  },
  {
    name: "merge empty favorites",
    application: "application",
    run: (api) => profileClients.mergeFavorites(api, []),
    method: "POST",
    path: "profile/favorites/merge",
    body: { ids: [] },
  },
  {
    name: "privacy",
    application: "application",
    run: (api) => profileClients.privacy(api),
    method: "GET",
    path: "profile/account/privacy",
  },
  {
    name: "privacy false preference",
    application: "application",
    run: (api) =>
      profileClients.updatePrivacy(api, { marketingConsent: false }),
    method: "POST",
    path: "profile/account/privacy/preferences",
    body: { marketingConsent: false },
  },
  {
    name: "account export",
    application: "application",
    run: (api) => profileClients.exportAccount(api),
    method: "GET",
    path: "profile/account/privacy/export",
  },
  {
    name: "confirmed deletion",
    application: "application",
    run: (api) => profileClients.requestDeletion(api),
    method: "POST",
    path: "profile/account/privacy/deletion",
    body: { confirm: true },
  },
  {
    name: "cancel deletion",
    application: "application",
    run: (api) => profileClients.cancelDeletion(api),
    method: "POST",
    path: "profile/account/privacy/deletion/cancel",
  },
  {
    name: "phone request",
    application: "application",
    run: (api) =>
      profileClients.requestPhoneChange(api, { phone: "09123456789" }),
    method: "POST",
    path: "profile/account/phone/request",
    body: { phone: "09123456789" },
  },
  {
    name: "phone verification",
    application: "application",
    run: (api) =>
      profileClients.verifyPhoneChange(api, {
        challengeId: "challenge",
        code: "00000",
      }),
    method: "POST",
    path: "profile/account/phone/verify",
    body: { challengeId: "challenge", code: "00000" },
  },
  {
    name: "affiliation page",
    application: "application",
    run: (api) => profileClients.affiliationPage(api, 2),
    method: "GET",
    path: "profile/coach/affiliations?page=2",
  },
  {
    name: "system policy",
    application: "application",
    run: (api) => systemClients.policy(api),
    method: "GET",
    path: "system/policy",
  },
  {
    name: "tariff list",
    application: "business",
    run: (api) => businessClients.tariffs(api, "club/id"),
    method: "GET",
    path: "business/clubs/club%2Fid/tariffs",
  },
  {
    name: "tariff history page",
    application: "business",
    run: (api) => businessClients.tariffHistory(api, "club/id", "tariff/id", 3),
    method: "GET",
    path: "business/clubs/club%2Fid/tariffs/tariff%2Fid/versions?page=3",
  },
  {
    name: "zero-price tariff",
    application: "business",
    run: (api) =>
      businessClients.createTariff(api, "club", { ...tariff, branchId: null }),
    method: "POST",
    path: "business/clubs/club/tariffs",
    body: { ...tariff, branchId: null },
  },
  {
    name: "tariff revision reason",
    application: "business",
    run: (api) =>
      businessClients.reviseTariff(api, "club", "tariff", {
        ...tariff,
        reason: "دلیل تغییر",
      }),
    method: "POST",
    path: "business/clubs/club/tariffs/tariff/versions",
    body: { ...tariff, reason: "دلیل تغییر" },
  },
  {
    name: "tariff status false",
    application: "business",
    run: (api) =>
      businessClients.setTariffStatus(api, "club", "tariff", {
        isActive: false,
        reason: "توقف طرح",
      }),
    method: "POST",
    path: "business/clubs/club/tariffs/tariff/status",
    body: { isActive: false, reason: "توقف طرح" },
  },
  {
    name: "business media preview",
    application: "business",
    run: (api) => businessClients.mediaPreview(api, "club/id", "media/id"),
    method: "GET",
    path: "business/clubs/club%2Fid/media/media%2Fid/preview",
  },
  {
    name: "admin media preview",
    application: "admin",
    run: (api) => adminClients.mediaPreview(api, "club/id", "media/id"),
    method: "GET",
    path: "admin/clubs/club%2Fid/media/media%2Fid/preview",
  },
  {
    name: "media deletion",
    application: "business",
    run: (api) => businessClients.deleteMedia(api, "club/id", "media/id"),
    method: "POST",
    path: "business/clubs/club%2Fid/media/media%2Fid/delete",
  },
];
for (const entry of cases)
  test(`PH1 contract: ${entry.name}`, async () => {
    let calls = 0;
    const api = createApiClient({
      application: entry.application,
      locale: "fa",
      fetch: async (url, init) => {
        calls++;
        assert.equal(String(url), `/api/v1/${entry.path}`);
        assert.equal(init?.method, entry.method);
        assert.equal(init?.credentials, "include");
        assert.equal(init?.cache, "no-store");
        assert.equal(
          new Headers(init?.headers).get("x-gym-client"),
          entry.application,
        );
        assert.equal(new Headers(init?.headers).get("Accept-Language"), "fa");
        assert.equal(
          init?.body,
          entry.body === undefined ? undefined : JSON.stringify(entry.body),
        );
        return Response.json([]);
      },
    });
    await entry.run(api);
    assert.equal(calls, 1);
  });
