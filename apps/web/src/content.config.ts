import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { existsSync } from "node:fs";

const localImage = z
  .string()
  .regex(/^\/images\/(?!.*\.\.)[^?#]+$/, "Image must be a local path under /images/")
  .refine(
    (path) => existsSync(new URL(`../public${path}`, import.meta.url)),
    "Image must exist in the web app's public directory",
  );

const localizedTourLabel = z.object({
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  imageAlt: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  terms: z.array(z.string().trim().min(1)).min(1).optional(),
});

const cityTours = defineCollection({
  loader: glob({ base: "./src/content/city-tours", pattern: "*.md" }),
  schema: z.object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    imageAlt: z.string().trim().min(1),
    status: z.enum(["draft", "approved", "hidden"]).default("draft"),
    order: z.number().int().nonnegative().default(100),
    durationHours: z.number().int().min(1).max(24).optional(),
    priceFrom: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).optional(),
    terms: z.array(z.string().trim().min(1)).min(1).optional(),
    gallery: z
      .array(
        z.object({
          src: localImage,
          alt: z.string().trim().min(1),
          altPt: z.string().trim().min(1).optional(),
          altZhHant: z.string().trim().min(1).optional(),
        }),
      )
      .min(1)
      .max(8)
      .optional(),
    image: localImage,
    translations: z
      .object({
        pt: localizedTourLabel.optional(),
        "zh-Hant": localizedTourLabel.optional(),
      })
      .optional(),
  }),
});

export const collections = { cityTours };
