import { Resend } from "resend";
import { getOptionalEnv, getRequiredEnv } from "@/lib/env";

export function getResendClient() {
  return new Resend(getRequiredEnv("RESEND_API_KEY"));
}

export function getDefaultReplyTo() {
  return getOptionalEnv("REPLY_TO_EMAIL") ?? getRequiredEnv("MAIL_FROM");
}
