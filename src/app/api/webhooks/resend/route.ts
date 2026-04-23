import { getOptionalEnv } from "@/lib/env";
import {
  recordWebhookEvent,
  saveInboundEmail,
  updateEmailStatusByResendId,
} from "@/lib/mail-store";
import { getResendClient } from "@/lib/resend";

export const dynamic = "force-dynamic";

type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    created_at?: string;
    from?: string;
    to?: string[];
    subject?: string;
    message_id?: string;
    in_reply_to?: string;
    headers?: Record<string, string>;
  };
  [key: string]: unknown;
};

function extractEmailAddress(value: string | undefined) {
  if (!value) {
    return "";
  }

  const match = value.match(/<([^>]+)>/);
  return match ? match[1] : value.trim();
}

function extractName(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^(.*?)\s*<[^>]+>$/);
  return match?.[1]?.trim() || null;
}

function mapStatus(type: string) {
  switch (type) {
    case "email.sent":
      return "sent";
    case "email.delivered":
      return "delivered";
    case "email.delivery_delayed":
      return "delivery_delayed";
    case "email.bounced":
      return "bounced";
    case "email.complained":
      return "complained";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    default:
      return type.replace("email.", "");
  }
}

export async function POST(request: Request) {
  const payload = await request.text();
  const webhookSecret = getOptionalEnv("RESEND_WEBHOOK_SECRET");
  const resend = getResendClient();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  let event: ResendWebhookEvent;

  try {
    if (webhookSecret) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        return Response.json(
          {
            error: "Missing webhook verification headers.",
          },
          { status: 400 },
        );
      }

      event = resend.webhooks.verify({
        payload,
        headers: {
          id: svixId,
          timestamp: svixTimestamp,
          signature: svixSignature,
        },
        webhookSecret,
      }) as ResendWebhookEvent;
    } else {
      event = JSON.parse(payload) as ResendWebhookEvent;
    }
  } catch {
    return Response.json(
      {
        error: "Invalid webhook signature.",
      },
      { status: 400 },
    );
  }

  const eventType = event.type ?? "unknown";
  const recorded = await recordWebhookEvent({
    source: "resend",
    svixId,
    eventType,
    payload: event as Record<string, unknown>,
  });

  if (!recorded.inserted) {
    return Response.json({
      ok: true,
      duplicate: true,
    });
  }

  if (eventType === "email.received" && event.data?.email_id) {
    const { data, error } = await resend.emails.receiving.get(event.data.email_id);

    if (error || !data) {
      return Response.json(
        {
          error: error?.message ?? "Unable to retrieve inbound email content.",
        },
        { status: 502 },
      );
    }

    await saveInboundEmail({
      resendEmailId: event.data.email_id,
      fromEmail: extractEmailAddress(event.data.from),
      fromName: extractName(event.data.from),
      toEmails: event.data.to ?? [],
      subject: event.data.subject ?? "",
      textBody: data.text ?? null,
      htmlBody: data.html ?? null,
      messageId: event.data.message_id ?? null,
      inReplyTo: event.data.in_reply_to ?? null,
      threadKey: event.data.in_reply_to ?? event.data.message_id ?? null,
      receivedAt: event.data.created_at ?? event.created_at ?? null,
      metadata: {
        provider: "resend",
        headers: data.headers ?? {},
      },
    });
  } else if (event.data?.email_id && eventType.startsWith("email.")) {
    await updateEmailStatusByResendId(event.data.email_id, mapStatus(eventType));
  }

  return Response.json({
    ok: true,
  });
}
