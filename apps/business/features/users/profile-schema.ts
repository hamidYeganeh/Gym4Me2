import { z } from "zod";

import { normalizeIranianMobile } from "../../lib/phone";

type ValidationKey =
  "name" | "username" | "bio" | "link" | "website" | "phone" | "duplicate" | "picture";

export function createProfileSchema(message: (key: ValidationKey) => string) {
  const handle = z
    .string()
    .trim()
    .regex(/^[\p{L}\p{N}_.-]{0,100}$/u, message("link"));
  return z.object({
    name: z.string().trim().min(1, message("name")),
    username: z
      .string()
      .trim()
      .regex(/^[\p{L}\p{N}_.-]{0,64}$/u, message("username")),
    bio: z.string().trim().max(500, message("bio")),
    instagram: handle,
    x: handle,
    youtube: handle,
    tiktok: handle,
    linkedin: z
      .string()
      .trim()
      .regex(/^(?:\/(?:in|company)\/[\w-]{1,100}\/?|)$/u, message("link")),
    website: z
      .string()
      .trim()
      .refine(
        (value) => !value || (/^https?:\/\//i.test(value) && z.url().safeParse(value).success),
        message("website"),
      ),
    avatar: z
      .string()
      .regex(/^(?:data:image\/(?:png|jpeg|webp);base64,[\w+/]+=*|)$/, message("picture")),
    phones: z
      .array(
        z.object({
          number: z
            .string()
            .trim()
            .refine((value) => Boolean(normalizeIranianMobile(value)), message("phone")),
        }),
      )
      .superRefine((phones, context) => {
        const seen = new Set<string>();
        phones.forEach(({ number }, index) => {
          const normalized = normalizeIranianMobile(number) ?? number;
          if (seen.has(normalized)) {
            context.addIssue({
              code: "custom",
              path: [index, "number"],
              message: message("duplicate"),
            });
          }
          seen.add(normalized);
        });
      }),
  });
}

export type Profile = z.infer<ReturnType<typeof createProfileSchema>>;

export const emptyProfile: Profile = {
  name: "",
  username: "",
  bio: "",
  instagram: "",
  x: "",
  youtube: "",
  tiktok: "",
  linkedin: "",
  website: "",
  avatar: "",
  phones: [],
};
