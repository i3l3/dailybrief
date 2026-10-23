import { z } from "zod";
const words = z.array(z.string().trim().min(1).max(200)).max(100);
const widget = z.enum([
  "weather",
  "meals",
  "stocks",
  "news",
  "mail",
  "geek",
  "cve",
]);
export const settingsSchema = z.object({
  interests: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(50),
        keywords: words,
        exclude: words,
      }),
    )
    .max(30),
  feeds: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        name: z.string().min(1).max(100),
        url: z
          .url()
          .max(2000)
          .refine((u) => /^https?:\/\//.test(u)),
        enabled: z.boolean(),
      }),
    )
    .max(30),
  cve: z.object({ tags: words, vendors: words, products: words, cpes: words }),
  location: z.object({
    name: z.string().max(100),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  school: z.object({
    name: z.string().max(150),
    office: z.string().max(20),
    code: z.string().max(30),
  }),
  stocks: z
    .array(
      z.object({
        symbol: z.string().regex(/^[A-Za-z0-9.\-]{1,20}$/),
        name: z.string().min(1).max(100),
        market: z.enum(["KR", "US"]),
        exchange: z.string().regex(/^[A-Z]{0,8}$/),
      }),
    )
    .max(30),
  ai: z.object({
    provider: z.enum(["openrouter", "openai"]),
    model: z.string().max(200),
    newsLimit: z.number().int().min(0).max(1000),
    mailLimit: z.number().int().min(0).max(1000),
  }),
  appearance: z.object({
    background: z.enum(["forest", "midnight", "slate"]),
    opacity: z.number().min(60).max(100),
    order: z
      .array(widget)
      .length(7)
      .refine((a) => new Set(a).size === 7),
    hidden: z.array(widget).max(7),
  }),
});
export const imapSchema = z.object({
  label: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  host: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9.-]+$/)
    .max(253),
  port: z
    .number()
    .int()
    .refine((p) => p === 993 || p === 143),
  user: z.string().min(1).max(254),
  password: z.string().min(1).max(1000),
});
