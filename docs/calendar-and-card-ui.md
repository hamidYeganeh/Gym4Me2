# Calendar, portrait club cards and fitness illustrations

Implemented 2026-10-24 from the user's supplied screen references and artwork.

The shared `ScheduleCalendar` renders a blurred photographic surface, localized month controls, rounded day cells and split booking cards. The application uses it in Calendars, Reservations/history and the home personal agenda. The public calendar directory remains below the personal schedule. Booking links, status, title, branch and time come from the real booking API; the generic training photograph is decorative.

Persian uses the Persian calendar, Saturday-first weeks and Persian numerals. English uses Gregorian months and Monday-first weeks. Both retain ISO day keys and Tehran booking-day boundaries. Keyboard navigation supports arrows, Home/End and Page Up/Down. Date selection, month and upcoming/past filters use the existing account-scoped list-state persistence.

The shared ClubCard portrait variant uses a full-height 9:13 photograph, theme-token scrim, price pill, optional saved control, metadata and full-width existing discovery action. Multiple supplied photos expose accessible photo selectors. Compact cards hide facilities when space is limited; landscape cards retain their list presentation. The reference's hotel/property copy and Reserve action are adapted to actual club information and navigation.

The unmodified fitness illustration sheet is bundled in the application and website, with decorative CSS positioning for each object. Shared empty states opt into suitable objects; a shared FitnessNote supports section notes and banners. The website location section includes a treadmill note linked to Download. Mobbin's [WHOOP empty state](https://mobbin.com/screens/f550cdd9-7fe3-4c8c-be8f-d68b3252d9c3) informed the restrained illustration/copy/action hierarchy. Mobbin screenshots are references only.

Validation: UI, application, API and website type checks and targeted lint passed. Seventeen focused tests passed: calendar/agenda/location helpers (10), booking cursor/date validation (3), PostgreSQL timezone boundaries (2) and i18n parity (2). The catalog copy guard and website production build also passed. Browser checks covered Persian and English, light and dark calendars, 320px and 390px layouts, date-filtered bookings/history, RTL keyboard navigation, portrait image bounds and preview actions, and the website illustration/link. The final calendar verification tab reported no warning/error logs.

Screenshots are local ignored evidence under `.artifacts/calendar-ui/`, `.artifacts/club-card/` and `.artifacts/fitness-illustrations/`. Calendar booking examples were created only in an isolated local synthetic database; the temporary test authentication session was removed after verification.

The required 12ui improvement attempt returned an exhausted free allowance / prepaid-wallet balance requirement. No balance was purchased, no candidate or comparison plan was returned, and no automated fidelity certification is claimed. The supplied references, existing theme and direct browser inspection guided this implementation.
