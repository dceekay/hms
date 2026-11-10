import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma";

export type AuditChange = {
  field: string;
  before?: string | number | boolean | null;
  after?: string | number | boolean | null;
};

export type SafeAuditEntry = {
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  userId?: string;
  summary: string;
  reference?: string | null;
  changes?: AuditChange[];
  ipAddress?: string | null;
  userAgent?: string | null;
};

const forbidden = /password|token|secret|hash|card|cvv|note|diagnosis|clinical|address|phone|email/i;

function safeValue(value: unknown): string | number | boolean | null | undefined {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return undefined;
}

/**
 * Persists operational audit entries only. This deliberately stores a small,
 * documented allow-list rather than accepting arbitrary request bodies.
 */
export async function recordAudit(entry: SafeAuditEntry): Promise<void> {
  try {
    const changes = (entry.changes ?? [])
      .filter((change) => change.field && !forbidden.test(change.field))
      .slice(0, 12)
      .map((change) => ({
        field: change.field.slice(0, 80),
        ...(safeValue(change.before) !== undefined ? { before: safeValue(change.before) } : {}),
        ...(safeValue(change.after) !== undefined ? { after: safeValue(change.after) } : {}),
      }));

    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entity: entry.entity.slice(0, 100),
        entityId: entry.entityId ?? null,
        userId: entry.userId ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ? entry.userAgent.slice(0, 500) : null,
        newValues: {
          summary: entry.summary.slice(0, 280),
          ...(entry.reference ? { reference: entry.reference.slice(0, 120) } : {}),
          ...(changes.length ? { changes } : {}),
        } as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    // A completed operational action must not be reported as failed if its
    // follow-up audit write is temporarily unavailable.
    console.error("Failed to record operational audit entry", error);
  }
}

export class AuditService {
  async list(params: {
    action?: string;
    entity?: string;
    userId?: string;
    query?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const action =
      params.action && Object.values(AuditAction).includes(params.action as AuditAction)
        ? (params.action as AuditAction)
        : undefined;
    const from = params.from ? new Date(params.from) : undefined;
    const to = params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined;
    const createdAt =
      (from && !Number.isNaN(from.valueOf())) || (to && !Number.isNaN(to?.valueOf() ?? NaN))
        ? {
            ...(from && !Number.isNaN(from.valueOf()) ? { gte: from } : {}),
            ...(to && !Number.isNaN(to?.valueOf() ?? NaN) ? { lte: to } : {}),
          }
        : undefined;
    const query = params.query?.trim();
    const where: Prisma.AuditLogWhereInput = {
      ...(action ? { action } : {}),
      ...(params.entity ? { entity: { contains: params.entity } } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(query
        ? {
            OR: [
              { entity: { contains: query } },
              { ipAddress: { contains: query } },
              {
                user: {
                  is: {
                    OR: [
                      { firstName: { contains: query } },
                      { lastName: { contains: query } },
                      { username: { contains: query } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => {
        const values = (
          item.newValues && typeof item.newValues === "object" ? item.newValues : {}
        ) as Record<string, unknown>;

        const actorName = item.user
          ? `${item.user.firstName} ${item.user.lastName}`.trim() || item.user.username
          : typeof values.staffName === "string"
          ? values.staffName
          : typeof values.fullName === "string"
          ? values.fullName
          : null;

        const deviceObj =
          values.device && typeof values.device === "object"
            ? (values.device as Record<string, unknown>)
            : null;
        const deviceSummary =
          typeof values.summary === "string" && item.action === AuditAction.LOGIN
            ? values.summary
            : deviceObj
            ? [deviceObj.type, deviceObj.os, deviceObj.browser].filter(Boolean).join(" · ")
            : typeof values.deviceType === "string"
            ? [values.deviceType, values.os, values.browser].filter(Boolean).join(" · ")
            : null;

        const computedSummary =
          typeof values.summary === "string" && item.action !== AuditAction.LOGIN
            ? values.summary
            : item.action === AuditAction.LOGIN
            ? `Staff sign-in by ${actorName || "User"}${deviceSummary ? ` (${deviceSummary})` : ""}`
            : `${item.action} ${item.entity}`;

        return {
          id: item.id,
          action: item.action,
          entity: item.entity,
          entityId: item.entityId,
          createdAt: item.createdAt,
          ipAddress: item.ipAddress || (typeof values.ipAddress === "string" ? values.ipAddress : null),
          deviceSummary: deviceSummary || null,
          actor: item.user
            ? {
                id: item.user.id,
                name: actorName || item.user.username,
                username: item.user.username,
              }
            : actorName
            ? {
                id: item.userId || "system",
                name: actorName,
                username: typeof values.username === "string" ? values.username : "",
              }
            : null,
          summary: computedSummary,
          reference:
            typeof values.reference === "string"
              ? values.reference
              : item.action === AuditAction.LOGIN && deviceSummary
              ? deviceSummary
              : null,
          changes: Array.isArray(values.changes) ? values.changes : [],
        };
      }),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }
}

