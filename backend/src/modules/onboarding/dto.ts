import { z } from "zod";

export const tourStatusQuerySchema = z.object({
  tourVersion: z.string().trim().min(1).max(30).default("2026.08"),
});

export const tourEventSchema = z.object({
  tourKey: z.string().trim().min(2).max(80),
  tourVersion: z.string().trim().min(1).max(30).default("2026.08"),
  roleName: z.string().trim().min(2).max(80),
  action: z.enum([
    "started",
    "step_viewed",
    "page_opened",
    "completed",
    "skipped",
    "dismissed",
    "dont_show_again",
  ]),
  stepIndex: z.coerce.number().int().min(0).default(0),
  totalSteps: z.coerce.number().int().min(0).default(0),
  path: z.string().trim().max(255).optional(),
  deviceType: z.enum(["desktop", "mobile", "tablet", "unknown"]).default("unknown"),
});

export type TourStatusQueryDto = z.infer<typeof tourStatusQuerySchema>;
export type TourEventDto = z.infer<typeof tourEventSchema>;
