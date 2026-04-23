import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { emails, webhookEvents } from "@/lib/db/schema";

export type EmailRecord = {
  id: string;
  resendEmailId: string | null;
  direction: "inbound" | "outbound";
  folder: string;
  status: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  replyTo: string | null;
  messageId: string | null;
  inReplyTo: string | null;
  threadKey: string | null;
  campaignId: string | null;
  metadata: Record<string, unknown>;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
};

type SaveOutboundEmailInput = {
  resendEmailId: string;
  fromEmail: string;
  toEmails: string[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  replyTo?: string;
  sentAt?: string;
  metadata?: Record<string, unknown>;
};

type SaveInboundEmailInput = {
  resendEmailId?: string;
  fromEmail: string;
  fromName?: string | null;
  toEmails: string[];
  subject: string;
  textBody?: string | null;
  htmlBody?: string | null;
  replyTo?: string | null;
  messageId?: string | null;
  inReplyTo?: string | null;
  threadKey?: string | null;
  receivedAt?: string | null;
  metadata?: Record<string, unknown>;
};

type WebhookEventInput = {
  source: string;
  svixId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
};

function mapEmailRow(row: typeof emails.$inferSelect): EmailRecord {
  return {
    id: row.id,
    resendEmailId: row.resendEmailId,
    direction: row.direction,
    folder: row.folder,
    status: row.status,
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    toEmails: row.toEmails,
    subject: row.subject,
    textBody: row.textBody,
    htmlBody: row.htmlBody,
    replyTo: row.replyTo,
    messageId: row.messageId,
    inReplyTo: row.inReplyTo,
    threadKey: row.threadKey,
    campaignId: row.campaignId,
    metadata: row.metadata ?? {},
    sentAt: row.sentAt,
    receivedAt: row.receivedAt,
    createdAt: row.createdAt,
  };
}

export async function listEmails() {
  const rows = await getDb()
    .select()
    .from(emails)
    .orderBy(
      desc(sql`coalesce(${emails.receivedAt}, ${emails.sentAt}, ${emails.createdAt})`),
    )
    .limit(100);

  return rows.map((row) => mapEmailRow(row));
}

export async function saveOutboundEmail(input: SaveOutboundEmailInput) {
  const sentAt = input.sentAt ?? new Date().toISOString();

  const [row] = await getDb()
    .insert(emails)
    .values({
      resendEmailId: input.resendEmailId,
      direction: "outbound",
      folder: "sent",
      status: "queued",
      fromEmail: input.fromEmail,
      toEmails: input.toEmails,
      subject: input.subject,
      textBody: input.textBody,
      htmlBody: input.htmlBody ?? null,
      replyTo: input.replyTo ?? null,
      sentAt,
      metadata: input.metadata ?? {},
      updatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: emails.resendEmailId,
      set: {
        folder: "sent",
        status: "queued",
        fromEmail: input.fromEmail,
        toEmails: input.toEmails,
        subject: input.subject,
        textBody: input.textBody,
        htmlBody: input.htmlBody ?? null,
        replyTo: input.replyTo ?? null,
        sentAt,
        metadata: input.metadata ?? {},
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return mapEmailRow(row);
}

export async function saveInboundEmail(input: SaveInboundEmailInput) {
  const receivedAt = input.receivedAt ?? new Date().toISOString();

  if (!input.resendEmailId) {
    const [row] = await getDb()
      .insert(emails)
      .values({
        direction: "inbound",
        folder: "inbox",
        status: "received",
        fromEmail: input.fromEmail,
        fromName: input.fromName ?? null,
        toEmails: input.toEmails,
        subject: input.subject,
        textBody: input.textBody ?? null,
        htmlBody: input.htmlBody ?? null,
        replyTo: input.replyTo ?? null,
        messageId: input.messageId ?? null,
        inReplyTo: input.inReplyTo ?? null,
        threadKey: input.threadKey ?? null,
        receivedAt,
        metadata: input.metadata ?? {},
        updatedAt: sql`now()`,
      })
      .returning();

    return mapEmailRow(row);
  }

  const [row] = await getDb()
    .insert(emails)
    .values({
      resendEmailId: input.resendEmailId,
      direction: "inbound",
      folder: "inbox",
      status: "received",
      fromEmail: input.fromEmail,
      fromName: input.fromName ?? null,
      toEmails: input.toEmails,
      subject: input.subject,
      textBody: input.textBody ?? null,
      htmlBody: input.htmlBody ?? null,
      replyTo: input.replyTo ?? null,
      messageId: input.messageId ?? null,
      inReplyTo: input.inReplyTo ?? null,
      threadKey: input.threadKey ?? null,
      receivedAt,
      metadata: input.metadata ?? {},
      updatedAt: sql`now()`,
    })
    .onConflictDoUpdate({
      target: emails.resendEmailId,
      set: {
        folder: "inbox",
        status: "received",
        fromEmail: input.fromEmail,
        fromName: input.fromName ?? null,
        toEmails: input.toEmails,
        subject: input.subject,
        textBody: input.textBody ?? null,
        htmlBody: input.htmlBody ?? null,
        replyTo: input.replyTo ?? null,
        messageId: input.messageId ?? null,
        inReplyTo: input.inReplyTo ?? null,
        threadKey: input.threadKey ?? null,
        receivedAt,
        metadata: input.metadata ?? {},
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return mapEmailRow(row);
}

export async function updateEmailStatusByResendId(
  resendEmailId: string,
  status: string,
) {
  const [row] = await getDb()
    .update(emails)
    .set({
      status,
      updatedAt: sql`now()`,
    })
    .where(eq(emails.resendEmailId, resendEmailId))
    .returning();

  return row ? mapEmailRow(row) : null;
}

export async function recordWebhookEvent(input: WebhookEventInput) {
  if (input.svixId) {
    const [row] = await getDb()
      .insert(webhookEvents)
      .values({
        source: input.source,
        svixId: input.svixId,
        eventType: input.eventType,
        payload: input.payload,
      })
      .onConflictDoNothing({
        target: webhookEvents.svixId,
      })
      .returning({
        id: webhookEvents.id,
      });

    return {
      inserted: Boolean(row),
    };
  }

  await getDb().insert(webhookEvents).values({
    source: input.source,
    eventType: input.eventType,
    payload: input.payload,
  });

  return {
    inserted: true,
  };
}
