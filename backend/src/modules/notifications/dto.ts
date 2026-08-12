import { z } from "zod";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(760),
  keys: z.object({
    p256dh: z.string().min(10).max(255),
    auth: z.string().min(5).max(255),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url().max(760),
});

export type ListNotificationsQueryDto = z.infer<typeof listNotificationsQuerySchema>;
export type PushSubscriptionDto = z.infer<typeof pushSubscriptionSchema>;
export type PushUnsubscribeDto = z.infer<typeof pushUnsubscribeSchema>;
