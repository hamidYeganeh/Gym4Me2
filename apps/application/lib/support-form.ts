export type SupportDraft = { title: string; body: string };
export type SupportErrors = Partial<
  Record<
    keyof SupportDraft,
    "supportTitleLength" | "supportDescriptionLength" | "supportReplyLength"
  >
>;

export function validateSupportDraft(
  draft: SupportDraft,
  reply: boolean,
): SupportErrors {
  const title = draft.title.trim();
  const body = draft.body.trim();
  return {
    ...(!reply && (title.length < 3 || title.length > 160)
      ? { title: "supportTitleLength" as const }
      : {}),
    ...(body.length < (reply ? 1 : 3) || body.length > 5000
      ? {
          body: reply
            ? ("supportReplyLength" as const)
            : ("supportDescriptionLength" as const),
        }
      : {}),
  };
}

export function isSupportReference(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
