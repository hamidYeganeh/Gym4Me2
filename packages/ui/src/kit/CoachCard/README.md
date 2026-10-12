# CoachCard variants

The original card remains the default. Use `variant="portrait"` for a grayscale,
image-led card with the coach's name and specialty at the bottom:

```tsx
<CoachCard variant="portrait" coach={coach} labels={labels} href={coachUrl} />
```

Optional `coach.socialLinks` populate the social bar. Each entry has a `platform`
(`facebook`, `instagram`, or `linkedin`), a full HTTP(S) `href`, and an optional
accessible `label`. Omit missing profiles; invalid URLs are ignored. The default
variant continues to show ratings, certification, experience, and the new badge.
Both variants support the existing save action and photo error fallback.
