import { createServer, type ServerResponse } from "node:http";
import type {
  ServiceDto,
  MembershipDto,
  DocumentDto,
  InvitationDto,
  NotificationDto,
  ConversationListItemDto,
  TicketDto,
} from "@repo/api/sports";
import { publicServiceListItem, webFixtureCoverId } from "./public-services";
import { publicPolicyFixture } from "./privacy";
import { protectedCatalogFixtures } from "./protected-catalog";
import { calendarFixtures } from "./calendars";
import {
  initialNotificationPreferences,
  refreshedNotificationPreferences,
} from "./notification-preferences";

export type WebReadScenario =
  | "populated"
  | "empty"
  | "unavailable"
  | "slow"
  | "missing-image"
  | "checkout-read"
  | "checkout-read-error"
  | "documents-read"
  | "documents-read-error"
  | "session-expired"
  | "privacy-read"
  | "preferences-read"
  | "preferences-refresh"
  | "preferences-refresh-error"
  | "invitations-read"
  | "invitations-empty"
  | "invitations-page-error"
  | "invitations-last-empty"
  | "notifications-read"
  | "notifications-empty"
  | "notifications-page-error"
  | "notifications-last-empty"
  | "notifications-forbidden"
  | "conversations-read"
  | "conversations-empty"
  | "conversations-page-error"
  | "conversations-last-empty"
  | "conversations-forbidden"
  | "support-read"
  | "support-empty"
  | "support-forbidden"
  | "support-unavailable"
  | "calendars-read"
  | "calendars-empty"
  | "calendars-page-error"
  | "calendars-last-empty"
  | "calendars-forbidden"
  | "calendars-page-forbidden"
  | "calendars-slow"
  | "protected-catalog"
  | "ph0-public";

/** Loopback-only test responses. No auth issuance, database, persistence or writes. */
export function webReadServer({
  services,
  image,
  scenario = "populated",
  memberships = [],
  documents = [],
  invitations = [],
  notifications = [],
  conversations = [],
  tickets = [],
}: {
  services: ServiceDto[];
  image?: Buffer;
  scenario?: WebReadScenario;
  memberships?: MembershipDto[];
  documents?: DocumentDto[];
  invitations?: InvitationDto[];
  notifications?: NotificationDto[];
  conversations?: ConversationListItemDto[];
  tickets?: TicketDto[];
}) {
  let preferenceReads = 0;
  const publicAudit = scenario === "ph0-public";
  const protectedCatalog =
    scenario === "protected-catalog" || publicAudit
      ? protectedCatalogFixtures()
      : null;
  const club = protectedCatalog?.clubs[0],
    branch = protectedCatalog?.branches[0];
  const displayServices =
    publicAudit && club && branch
      ? services.map((service) => ({
          ...service,
          organizationId: club.id,
          branchId: branch.id,
          clubName: club.name,
          branchName: branch.name,
        }))
      : services;
  const calendarData =
    scenario.startsWith("calendars-") || publicAudit
      ? calendarFixtures(displayServices)
      : null;
  if (publicAudit && calendarData && club && branch)
    for (const calendar of calendarData.calendars)
      Object.assign(calendar, {
        organizationId: club.id,
        branchId: branch.id,
        clubName: club.name,
        branchName: branch.name,
      });
  const json = (res: ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Gym4me-Web-Fixture": "readonly",
    });
    res.end(JSON.stringify(body));
  };
  return createServer((req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      req.resume();
      res.setHeader("Allow", "GET, HEAD");
      return json(res, 405, { code: "Errors.requestFailed" });
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/__fixture/health")
      return json(res, 200, {
        readonly: true,
        scenario,
        services: services.length,
      });
    if (
      (scenario === "privacy-read" || publicAudit) &&
      url.pathname === "/api/v1/system/policy"
    )
      return json(res, 200, publicPolicyFixture);
    if (
      calendarData &&
      (url.pathname.startsWith("/api/v1/sports/calendars") ||
        url.pathname === "/api/v1/sports/community/calendars/page")
    ) {
      if (
        publicAudit &&
        url.pathname === "/api/v1/sports/community/calendars/page"
      )
        return json(res, 401, { code: "Errors.requestFailed" });
      const list = scenario === "calendars-empty" ? [] : calendarData.calendars;
      const cursor = url.searchParams.get("cursor");
      const delayed = (respond: () => void) => {
        if (cursor || scenario === "calendars-slow") {
          const timer = setTimeout(respond, cursor ? 800 : 1200);
          res.once("close", () => clearTimeout(timer));
        } else respond();
      };
      const respondPage = (items: { id: string }[], limit: number) => {
        const anchor = cursor
          ? items.findIndex((item) => item.id === cursor)
          : -1;
        if (cursor && anchor < 0)
          return json(res, 400, { code: "Backend.invalidCalendarCursor" });
        delayed(() => {
          if (cursor && scenario === "calendars-page-forbidden")
            return json(res, 403, { code: "Errors.requestFailed" });
          if (cursor && scenario === "calendars-page-error")
            return json(res, 503, { code: "Errors.requestFailed" });
          const page =
            cursor && scenario === "calendars-last-empty"
              ? []
              : items.slice(anchor + 1, anchor + 1 + limit);
          json(res, 200, {
            items: page,
            nextCursor:
              page.length && items.length > anchor + 1 + limit
                ? page.at(-1)!.id
                : null,
          });
        });
      };
      if (url.pathname.endsWith("/page")) {
        if (
          scenario === "calendars-forbidden" &&
          url.pathname.includes("/community/")
        )
          return json(res, 403, { code: "Errors.requestFailed" });
        const search = (url.searchParams.get("search") ?? "")
          .trim()
          .toLocaleLowerCase();
        const limit = Number(url.searchParams.get("limit") ?? 20);
        if (
          search.length > 100 ||
          !Number.isInteger(limit) ||
          limit < 1 ||
          limit > 25 ||
          [...url.searchParams.keys()].some(
            (key) => !["search", "cursor", "limit"].includes(key),
          )
        )
          return json(res, 400, { code: "Errors.requestFailed" });
        return respondPage(
          list.filter((calendar) =>
            `${calendar.title} ${calendar.clubName} ${calendar.branchName}`
              .toLocaleLowerCase()
              .includes(search),
          ),
          limit,
        );
      }
      const match = url.pathname.match(
        /^\/api\/v1\/sports\/calendars\/([^/]+)(\/services)?$/,
      );
      if (match) {
        const calendar = list.find(({ id }) => id === match[1]);
        if (!calendar)
          return json(res, 404, { code: "Backend.calendarUnavailable" });
        const services = calendarData.servicesFor(calendar);
        if (match[2]) {
          if ([...url.searchParams.keys()].some((key) => key !== "cursor"))
            return json(res, 400, { code: "Errors.requestFailed" });
          return respondPage(services, 20);
        }
        return delayed(() =>
          json(res, 200, {
            ...calendar,
            services: services.slice(0, 20),
            nextServiceCursor: services.length > 20 ? services[19]!.id : null,
          }),
        );
      }
      return json(res, 404, { code: "Errors.requestFailed" });
    }
    if (protectedCatalog && url.pathname.startsWith("/api/v1/catalog/")) {
      const data = protectedCatalog;
      if (url.pathname === "/api/v1/catalog/clubs") {
        const search = (url.searchParams.get("search") ?? "").toLowerCase();
        const page = Number(url.searchParams.get("page") ?? 1);
        return json(
          res,
          200,
          page === 1
            ? data.summaries.filter((club) =>
                club.name.toLowerCase().includes(search),
              )
            : [],
        );
      }
      const match = url.pathname.match(
        /^\/api\/v1\/catalog\/clubs\/([^/]+)(?:\/branches\/([^/]+)(\/reviews)?)?$/,
      );
      if (match) {
        const club = data.clubs.find((c) => c.id === match[1]);
        if (!club) return json(res, 404, { code: "Errors.requestFailed" });
        if (!match[2]) return json(res, 200, club);
        const branch = data.branches.find(
          (b) => b.id === match[2] && b.clubId === club.id,
        );
        return branch
          ? json(res, 200, match[3] ? [] : branch)
          : json(res, 404, { code: "Errors.requestFailed" });
      }
      if (url.pathname.startsWith("/api/v1/catalog/taxonomies/")) {
        const kind = url.pathname.split("/").at(-1);
        return json(
          res,
          200,
          kind === "club-categories"
            ? [data.category]
            : kind === "sports"
              ? [data.sport]
              : [],
        );
      }
      if (url.pathname.startsWith("/api/v1/catalog/locations/"))
        return json(res, 200, []);
    }
    if (
      scenario.startsWith("support-") &&
      url.pathname.startsWith("/api/v1/sports/community/support")
    ) {
      if (scenario === "support-forbidden")
        return json(res, 403, { code: "Errors.requestFailed" });
      if (scenario === "support-unavailable")
        return json(res, 503, { code: "Errors.requestFailed" });
      const list = scenario === "support-empty" ? [] : tickets;
      if (url.pathname === "/api/v1/sports/community/support")
        return json(
          res,
          200,
          list.map(({ messages, ...ticket }) => {
            void messages;
            return ticket;
          }),
        );
      const id = url.pathname.match(
        /^\/api\/v1\/sports\/community\/support\/([^/]+)$/,
      )?.[1];
      const ticket = list.find((ticket) => ticket.id === id);
      return ticket
        ? json(res, 200, ticket)
        : json(res, 404, { code: "Errors.requestFailed" });
    }
    if (
      scenario.startsWith("conversations-") &&
      url.pathname === "/api/v1/sports/community/conversations/page"
    ) {
      if (scenario === "conversations-forbidden")
        return json(res, 403, { code: "Errors.requestFailed" });
      const archived = url.searchParams.get("archived") ?? "false";
      const cursor = url.searchParams.get("cursor");
      if (
        !["true", "false"].includes(archived) ||
        Array.from(url.searchParams.keys()).some(
          (key) => key !== "cursor" && key !== "archived",
        )
      )
        return json(res, 400, { code: "Backend.invalidConversationCursor" });
      const list =
        scenario === "conversations-empty"
          ? []
          : conversations.filter((c) => c.archived === (archived === "true"));
      const anchor = cursor ? list.findIndex((c) => c.id === cursor) : -1;
      if (cursor && anchor < 0)
        return json(res, 400, { code: "Backend.invalidConversationCursor" });
      const next = () => {
        if (cursor && scenario === "conversations-last-empty")
          return json(res, 200, { items: [], nextCursor: null });
        if (cursor && scenario === "conversations-page-error")
          return json(res, 503, { code: "Errors.requestFailed" });
        const items = list.slice(anchor + 1, anchor + 21);
        return json(res, 200, {
          items,
          nextCursor:
            list.length > anchor + 21 ? (items.at(-1)?.id ?? null) : null,
        });
      };
      if (cursor) {
        const timer = setTimeout(next, 800);
        res.once("close", () => clearTimeout(timer));
      } else next();
      return;
    }
    if (
      scenario.startsWith("notifications-") &&
      url.pathname === "/api/v1/sports/community/notifications/page"
    ) {
      if (scenario === "notifications-forbidden")
        return json(res, 403, { code: "Errors.requestFailed" });
      const view = url.searchParams.get("view") ?? "all";
      const cursor = url.searchParams.get("cursor");
      if (
        !["all", "unread"].includes(view) ||
        Array.from(url.searchParams.keys()).some(
          (key) => key !== "cursor" && key !== "view",
        )
      )
        return json(res, 400, { code: "Backend.invalidNotificationCursor" });
      const list =
        scenario === "notifications-empty"
          ? []
          : notifications.filter((n) => view !== "unread" || !n.readAt);
      const anchor = cursor ? list.findIndex((n) => n.id === cursor) : -1;
      if (cursor && anchor < 0)
        return json(res, 400, { code: "Backend.invalidNotificationCursor" });
      const next = () => {
        if (cursor && scenario === "notifications-last-empty")
          return json(res, 200, { items: [], nextCursor: null });
        if (cursor && scenario === "notifications-page-error")
          return json(res, 503, { code: "Errors.requestFailed" });
        const items = list.slice(anchor + 1, anchor + 21);
        return json(res, 200, {
          items,
          nextCursor:
            list.length > anchor + 21 ? (items.at(-1)?.id ?? null) : null,
        });
      };
      if (cursor) {
        const timer = setTimeout(next, 800);
        res.once("close", () => clearTimeout(timer));
      } else next();
      return;
    }
    if (
      scenario.startsWith("invitations-") &&
      url.pathname === "/api/v1/sports/community/invitations"
    ) {
      const cursor = url.searchParams.get("cursor");
      if (Array.from(url.searchParams.keys()).some((key) => key !== "cursor"))
        return json(res, 400, { code: "Backend.invalidInvitationCursor" });
      const list = scenario === "invitations-empty" ? [] : invitations;
      const anchor = cursor ? list.findIndex((i) => i.id === cursor) : -1;
      if (cursor && anchor < 0)
        return json(res, 400, { code: "Backend.invalidInvitationCursor" });
      const next = () => {
        if (cursor && scenario === "invitations-last-empty")
          return json(res, 200, { items: [], nextCursor: null });
        if (cursor && scenario === "invitations-page-error")
          return json(res, 503, { code: "Errors.requestFailed" });
        const items = list.slice(anchor + 1, anchor + 26);
        const nextCursor =
          list.length > anchor + 26 ? (items.at(-1)?.id ?? null) : null;
        json(res, 200, { items, nextCursor });
      };
      if (cursor) {
        const timer = setTimeout(next, 800);
        res.once("close", () => clearTimeout(timer));
      } else next();
      return;
    }
    if (
      url.pathname === "/api/v1/sports/community/preferences" &&
      scenario.startsWith("preferences-")
    ) {
      if (req.method === "GET") preferenceReads++;
      if (scenario === "preferences-read" || preferenceReads <= 1)
        return json(res, 200, initialNotificationPreferences);
      const timer = setTimeout(() => {
        if (scenario === "preferences-refresh-error")
          return json(res, 503, { code: "Errors.requestFailed" });
        json(res, 200, refreshedNotificationPreferences);
      }, 700);
      res.once("close", () => clearTimeout(timer));
      return;
    }
    if (
      scenario === "session-expired" &&
      /^\/api\/v1\/(?:profile\/|auth\/|business\/|admin\/|sports\/(?!services(?:\/|$)|media\/))/.test(
        url.pathname,
      )
    )
      return json(res, 401, { code: "Backend.theSessionHasEndedSignInAgain" });
    // Opt-in DTO simulation for checkout UI only, never an authenticated session.
    if (url.pathname === "/api/v1/sports/account/memberships") {
      if (scenario === "checkout-read") return json(res, 200, memberships);
      if (scenario === "checkout-read-error")
        return json(res, 503, { code: "Errors.requestFailed" });
    }
    if (url.pathname === "/api/v1/sports/documents") {
      if (scenario === "documents-read") return json(res, 200, documents);
      if (scenario === "documents-read-error")
        return json(res, 503, { code: "Errors.requestFailed" });
    }
    // Profile/auth stay signed out, including when local cookies are present.
    if (
      url.pathname.startsWith("/api/v1/profile/") ||
      url.pathname.startsWith("/api/v1/auth/") ||
      url.pathname.startsWith("/api/v1/sports/account/") ||
      url.pathname === "/api/v1/sports/documents" ||
      url.pathname.startsWith("/api/v1/sports/documents/") ||
      url.pathname.startsWith("/api/v1/sports/community/support")
    )
      return json(res, 401, { code: "Errors.requestFailed" });
    const respond = () => {
      if (scenario === "unavailable")
        return json(res, 503, { code: "Errors.requestFailed" });
      const catalog = scenario === "empty" ? [] : displayServices;
      if (url.pathname === "/api/v1/sports/services") {
        const search = (url.searchParams.get("q") ?? "").toLocaleLowerCase();
        if (search.length > 160)
          return json(res, 400, { code: "Errors.requestFailed" });
        return json(
          res,
          200,
          catalog
            .filter(
              (s) =>
                (!url.searchParams.has("organizationId") ||
                  s.organizationId ===
                    url.searchParams.get("organizationId")) &&
                (!url.searchParams.has("branchId") ||
                  s.branchId === url.searchParams.get("branchId")) &&
                `${s.title} ${s.description}`
                  .toLocaleLowerCase()
                  .includes(search),
            )
            .map(publicServiceListItem),
        );
      }
      const serviceId = url.pathname.match(
        /^\/api\/v1\/sports\/services\/([^/]+)$/,
      )?.[1];
      if (serviceId) {
        const service =
          catalog.find((s) => s.id === serviceId) ??
          calendarData?.serviceFor(serviceId);
        if (!service) return json(res, 404, { code: "Errors.requestFailed" });
        const detail = { ...service };
        // nextStartAt is a list projection, absent from the current detail SELECT.
        const { nextStartAt, ...body } = detail;
        void nextStartAt;
        return json(res, 200, body);
      }
      if (
        url.pathname === `/api/v1/sports/media/${webFixtureCoverId}` &&
        image &&
        scenario !== "missing-image" &&
        catalog.length
      ) {
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": image.length,
          "Cache-Control": "public, max-age=60",
          "X-Gym4me-Web-Fixture": "readonly",
        });
        return res.end(req.method === "HEAD" ? undefined : image);
      }
      return json(res, 404, { code: "Errors.requestFailed" });
    };
    if (scenario === "slow") {
      const timer = setTimeout(respond, 800);
      res.once("close", () => clearTimeout(timer));
    } else respond();
  });
}
