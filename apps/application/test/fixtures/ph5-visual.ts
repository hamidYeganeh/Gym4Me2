import type { AdvancedData } from "@repo/api/advanced-business";
import { webFixtureId as id } from "./public-services";
const org = id(800),
  branch = id(801),
  coach = id(802),
  statement = id(803),
  contract = id(804);
/** Isolated visual data. This adapter never reads or writes a server. */
export function ph5Visual(path: string): Response | null {
  if (
    /^(business\/advanced|admin\/advanced|profile\/settlements)\/options$/.test(
      path,
    )
  )
    return Response.json({
      organizations: [
        { id: org, name: "باشگاه آبان", role: "owner", all_branches: true },
      ],
      branches: [
        { id: branch, organization_id: org, name: "شعبهٔ ونک" },
        { id: id(805), organization_id: org, name: "شعبهٔ پاسداران" },
      ],
    });
  if (!/^(business\/advanced|admin\/advanced|profile\/settlements)$/.test(path))
    return null;
  const data: AdvancedData = {
    plans: [
      {
        code: "basic",
        amount_minor: "0",
        branch_limit: 1,
        advanced_finance: false,
        terms: "",
        revision: 1,
      },
      {
        code: "pro",
        amount_minor: "0",
        branch_limit: 20,
        advanced_finance: true,
        terms: "",
        revision: 1,
      },
    ],
    subscription: {
      plan_code: "pro",
      revision: 1,
      expires_at: null,
      branch_limit: 20,
      advanced_finance: true,
    },
    branches: [
      {
        id: branch,
        name: "شعبهٔ ونک",
        active: true,
        revision: 0,
        future_bookings: 12,
      },
      {
        id: id(805),
        name: "شعبهٔ پاسداران",
        active: true,
        revision: 0,
        future_bookings: 8,
      },
    ],
    contracts: [
      {
        id: contract,
        branch_id: branch,
        coach_id: coach,
        coach_name: "نیلوفر رضایی",
        version: 2,
        starts_on: "2026-09-01",
        ends_on: null,
        share_basis_points: 6000,
        basis: "net",
        mode: null,
      },
    ],
    statements: [
      {
        id: statement,
        organization_id: org,
        branch_id: branch,
        coach_id: coach,
        coach_name: "نیلوفر رضایی",
        branch_name: "شعبهٔ ونک",
        from_on: "2026-09-01",
        to_on: "2026-09-30",
        status: "approved",
        revision: 2,
        earned_minor: "12400000",
        adjusted_minor: "-400000",
        paid_minor: "5000000",
      },
    ],
    earnings: [
      {
        id: id(806),
        statement_id: statement,
        contract_id: contract,
        reservation_id: id(807),
        source_key: "reservation:" + id(807),
        amount_minor: "12400000",
        basis_snapshot: {},
      },
    ],
    payouts: [
      {
        id: id(808),
        statement_id: statement,
        amount_minor: "5000000",
        method: "manual",
        reference: "ABAN-1405-0012",
        state: "succeeded",
        created_at: "2026-10-01",
      },
    ],
    adjustments: [
      {
        id: id(809),
        earning_id: id(806),
        amount_minor: "-400000",
        reason: "اصلاح سهم جلسهٔ لغوشده",
      },
    ],
    disputes: [],
    memberships: [
      {
        id: id(810),
        revision: 1,
        branch_id: branch,
        granted: 12,
        consumed: 0,
        display_name: "آرمان احمدی",
        title: "عضویت ۱۲ جلسه‌ای",
      },
    ],
    allocations: [],
    services: [
      {
        id: id(811),
        title: "تمرین گروهی صبح",
        branch_id: branch,
        kind: "class",
      },
      {
        id: id(812),
        title: "تمرین گروهی عصر",
        branch_id: id(805),
        kind: "class",
      },
    ],
    prices: [],
    report: {
      sold_minor: "48600000",
      collected_minor: "42200000",
      unique_members: 48,
      renewals: 12,
      renewal_denominator: 30,
      capacity: "240",
    },
    comparison: [
      {
        id: branch,
        name: "شعبهٔ ونک",
        sold_minor: "28600000",
        allocated_minor: "7500000",
        members: 32,
      },
      {
        id: id(805),
        name: "شعبهٔ پاسداران",
        sold_minor: "20000000",
        allocated_minor: "4500000",
        members: 24,
      },
    ],
  };
  return Response.json(data);
}
