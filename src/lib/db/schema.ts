import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const emails = pgTable(
  "emails",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    resendEmailId: text("resend_email_id").unique(),
    direction: text("direction").$type<"inbound" | "outbound">().notNull(),
    folder: text("folder").notNull().default("inbox"),
    status: text("status").notNull().default("received"),
    fromEmail: text("from_email").notNull(),
    fromName: text("from_name"),
    toEmails: text("to_emails").array().notNull().default(sql`ARRAY[]::TEXT[]`),
    ccEmails: text("cc_emails").array().notNull().default(sql`ARRAY[]::TEXT[]`),
    bccEmails: text("bcc_emails").array().notNull().default(sql`ARRAY[]::TEXT[]`),
    subject: text("subject").notNull().default(""),
    textBody: text("text_body"),
    htmlBody: text("html_body"),
    replyTo: text("reply_to"),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    threadKey: text("thread_key"),
    campaignId: text("campaign_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("emails_created_at_idx").on(table.createdAt),
    index("emails_direction_idx").on(table.direction),
    index("emails_thread_key_idx").on(table.threadKey),
    check(
      "emails_direction_check",
      sql`${table.direction} in ('inbound', 'outbound')`,
    ),
  ],
);

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  source: text("source").notNull(),
  svixId: text("svix_id").unique(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});
