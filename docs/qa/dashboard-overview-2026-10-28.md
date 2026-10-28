# Coach and business home analytics

The application home includes a compact overview for accounts whose server navigation reports `canCoach`. The coaching workspace opens on an Overview tab with full charts. Business home includes the overview for owner, manager, and accountant memberships. Backend analytics continues to enforce branch access and coach sharing permissions.

## Metrics and dates

All cards, daily charts, and the expandable data table consume the existing authenticated `business/analytics` or `profile/coach-analytics` report. There is no sample-data fallback. Periods cover 7, 30, or 90 inclusive Tehran calendar days and compare with the preceding adjacent period of equal length. Today is incomplete. Business organization/branch filters apply to both periods.

- Net collections: verified payments minus succeeded refunds recorded in the selected period. This is neither profit nor coach earnings. The report stores rials; the overview presents tomans with the rial remainder retained. Totals and tooltips use exact integer arithmetic.
- Bookings: reservations by creation date, including later cancellations.
- Attendance: attendance entries and membership visits by recording date, not distinct people or a booking conversion rate.
- Booked capacity: confirmed, completed, and no-show reservations divided by non-cancelled occurrence capacity by session date. No scheduled capacity displays an em dash, not a measured zero.
- Coach service sessions: non-cancelled occurrences of assigned club services. Private training is measured separately through shared completed workouts, reviews, and published plan versions in active collaborations.
- Workout sharing uses completion dates; reviews use review dates and may refer to workouts completed in an earlier period. No review rate or pending-review backlog is inferred from those event counts.

Query failures display the existing retry notice. A successful empty report displays zero counts and an explicit empty chart. A missing previous report never becomes a fabricated comparison.

## Verification

- UI, application, and business TypeScript checks.
- Targeted lint checks for the changed components and helpers.
- Eight aggregation/date/money tests, including existing analytics helpers.
- Browser checks on business home, coaching Overview, and application home: desktop English, mobile Persian RTL, period selection, business branch scope, daily table, successful empty reports, and API failures. Browser responses are synthetic, intercepted test fixtures; they do not create production records or validate live production activity.
- Reviewed screenshots under `.artifacts/dashboard-overview-2026-10-28/`. Responsive layouts depend on the dashboard container width, accommodating the application's narrow desktop frame.

The external 12UI candidate service was attempted but returned `503 container_release_mismatch`. The implementation follows the project's existing components, tokens, and Recharts library instead.
