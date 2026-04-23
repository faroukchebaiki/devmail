import type { CreateEmailOptions } from "resend";
import { getDefaultReplyTo, getResendClient } from "@/lib/resend";
import { getRequiredEnv } from "@/lib/env";
import { saveOutboundEmail } from "@/lib/mail-store";

type SendEmailBody = {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as SendEmailBody;
  const to = body.to?.trim();
  const subject = body.subject?.trim();
  const text = body.text?.trim();
  const html = body.html?.trim();

  if (!to || !subject || (!text && !html)) {
    return Response.json(
      {
        error: "Missing required fields: to, subject, and text or html.",
      },
      { status: 400 },
    );
  }

  const resend = getResendClient();
  const from = getRequiredEnv("MAIL_FROM");
  const replyTo = getDefaultReplyTo();
  const recipients = to
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return Response.json(
      {
        error: "Please provide at least one recipient email address.",
      },
      { status: 400 },
    );
  }

  const emailPayload: CreateEmailOptions = html
    ? {
        from,
        to: recipients,
        replyTo,
        subject,
        html,
        text: text || undefined,
      }
    : {
        from,
        to: recipients,
        replyTo,
        subject,
        text: text ?? "",
      };

  const { data, error } = await resend.emails.send(emailPayload);

  if (error || !data?.id) {
    return Response.json(
      {
        error: error?.message ?? "Resend failed to queue the email.",
      },
      { status: 502 },
    );
  }

  const email = await saveOutboundEmail({
    resendEmailId: data.id,
    fromEmail: from,
    toEmails: recipients,
    subject,
    textBody: text ?? "",
    htmlBody: html,
    replyTo,
    metadata: {
      provider: "resend",
    },
  });

  return Response.json({
    email,
  });
}
