# PH5 — advanced business implementation

Scope: T130–T141, extending the existing PH0–PH4 application. No production sample data or accounts are recreated. No bank charge or external transfer is activated.

## Decisions for the free demonstration

- Basic: one active branch. Pro: initially 20 active branches, advanced finance and shared memberships. Both initial prices are zero; administrators can configure the advanced price and branch limit with a reason and revision. Basic remains free with one branch. These are editable evaluation defaults, not final commercial terms. Pro activation requires explicit owner acceptance and a simulated payment result. Real selling remains disabled outside the explicit demo mode until an actual provider is implemented.
- Payment states are succeeded, failed and unknown. Unknown results must be reconciled before another attempt. Successful renewals extend the current expiry by selected 30-day periods. Terms, price, limits and catalog revision are snapshotted. Changing the catalog does not rewrite accepted subscriptions.
- Legacy branches present at migration keep their existing branch count until the owner selects a plan. New organizations created through the business API start on Basic. Downgrading preserves booking, statement, contract and payment history; new advanced configurations/periods are gated. Existing approved statements remain payable. Excess branches cannot create/edit new service versions; owner can stop new sales and later reactivate within quota. Existing reservations remain actionable.
- Rules attach once to an immutable PH3 contract version. Percentage uses its recorded percentage and gross/net basis. Business-borne discounts use the original gross amount; shared discounts use collected amount. Net deducts explicit per-session space cost and platform basis points. Per-session amount is agreed explicitly; fixed amounts cover 30 days and are prorated by effective calendar days. Integer IRR arithmetic floors each result.
- A completed reservation generates at most one earning. Paid membership-funded sessions use the membership's original paid order and granted-session denominator, rather than a zero-price reservation order. Unlimited memberships require an explicit per-session or fixed basis; percentage calculation is blocked instead of reusing a whole subscription price for every session. Contract selection uses the branch-local service date. Fixed amounts select the effective contract per day. New contracts cannot rewrite closed earnings.
- Existing confirmed PH3 manual ledger balances are not silently imported or counted again. Advanced rules start on a new contract version when a prior confirmed manual ledger exists. Once an advanced earning exists, the old manual ledger write path rejects further entries for that contract; adjustments/payments use statements.
- Periods cannot overlap for the same coach and branch. They must have ended before closing. Close, approve, payout, reconcile and disputes use scoped authorization, operation receipts and revisions. Failed payments have no monetary effect. Unknown payments block another payout. Corrections append signed evidence rather than editing settled amounts. Refund/session-result changes are reconciled before approval/payment; post-payment claims can create positive or negative adjustment evidence. Negative balances remain visible, not automatically collected from a coach's bank.
- Owners explicitly select eligible services and revenue weights before a shared membership's first reservation/consumption. Scopes are restricted to the same organization. One existing membership row continues to serialize allowance across branches. Allocation weights sum to 10,000; stable branch ordering assigns rounding remainder to the last branch. Snapshots remain immutable; consolidated allocation reporting recomputes net allocation after source refunds with the same remainder rule.
- Organization-wide base prices and branch exceptions affect future service versions only. Existing versions and orders are preserved. Existing staff/branch permissions remain in force.

## Surfaces and privacy

- Business `/advanced`: statements, contracts/rules, branches/shared memberships, plan activation and consolidated reports.
- Admin `/advanced`: reasoned catalog changes, scoped statements and dispute decisions. No health record or private coach conversation is included.
- Application `/coaching/settlements`: coach's own statements, source lines, payouts and disputes; reachable from the existing finance tab. Former coaches retain access to their own financial obligations.
- Filter controls use the shared bottom sheet; cards use existing fonts, colors and components. Persian/English, RTL, keyboard and reduced-motion use existing infrastructure.
- Account export includes the person's statements/earnings/payouts/adjustments/disputes. Financial evidence references retained anonymized user records under the existing financial-retention policy; no private media is added or cached.
- Reference inspected: [Dub payout management](https://mobbin.com/screens/3d1afabd-f39c-4996-87b1-93086f05af85). The summary balances and statement rows inform hierarchy; existing Gym4Me theme is retained.

## Validation

A dedicated isolated-local PostgreSQL suite covers tenant/branch permissions, coach scope, immutable/overlap rules, repeated/concurrent payouts, unknown-result reconciliation, post-payment adjustments, refunds, fixed fees, downgrade preservation, pricing and a shared membership's last-session race. It never points at production. Unit tests verify integer financial calculations and allocation constraints. Test and release results are recorded in the PH5 QA report.

Financial statements and membership controls paginate at 100 rows. Server summary balances aggregate the entire selected scope, independently of the current page. Renewal metrics count successful repeat membership purchases, excluding zero-price class redemptions.
