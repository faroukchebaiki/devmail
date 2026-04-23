"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Mail, Mailbox, RefreshCcw, SendHorizonal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmailRecord } from "@/lib/mail-store";

type EmailDashboardProps = {
  defaultFrom: string;
  inboundAddress: string;
};

type EmailsResponse = {
  emails: EmailRecord[];
};

function formatDate(value: string | null) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getPreview(email: EmailRecord) {
  if (email.textBody) {
    return email.textBody;
  }

  if (email.htmlBody) {
    return email.htmlBody.replace(/<[^>]+>/g, " ");
  }

  return "No content available yet.";
}

export function EmailDashboard({
  defaultFrom,
  inboundAddress,
}: EmailDashboardProps) {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    to: "",
    subject: "",
    text: "",
  });

  async function loadEmails() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/emails", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as EmailsResponse;

      if (!response.ok) {
        throw new Error("Unable to load emails.");
      }

      setEmails(data.emails);
      setSelectedEmailId((current) => current ?? data.emails[0]?.id ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Unable to load emails.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEmails();
  }, []);

  const selectedEmail =
    emails.find((email) => email.id === selectedEmailId) ?? emails[0] ?? null;

  const stats = useMemo(() => {
    const inbound = emails.filter((email) => email.direction === "inbound").length;
    const outbound = emails.filter((email) => email.direction === "outbound").length;

    return {
      total: emails.length,
      inbound,
      outbound,
    };
  }, [emails]);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/emails/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to send email.");
      }

      setForm({
        to: "",
        subject: "",
        text: "",
      });
      setSuccess("Email queued with Resend.");
      await loadEmails();
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Unable to send email.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-svh bg-muted/30">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
        <header className="flex flex-col gap-3 rounded-3xl border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Personal email dashboard</p>
              <h1 className="text-3xl font-semibold tracking-tight">Devmail</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              Replies should be routed to <span className="font-medium text-foreground">{inboundAddress}</span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardDescription>Total stored emails</CardDescription>
                <CardTitle className="text-2xl">{stats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardDescription>Inbound replies</CardDescription>
                <CardTitle className="text-2xl">{stats.inbound}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardDescription>Outbound sends</CardDescription>
                <CardTitle className="text-2xl">{stats.outbound}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SendHorizonal className="size-4" />
                Compose
              </CardTitle>
              <CardDescription>Send from {defaultFrom}</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSend}>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="to">
                    To
                  </label>
                  <Input
                    id="to"
                    placeholder="person@example.com, team@example.com"
                    value={form.to}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, to: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="subject">
                    Subject
                  </label>
                  <Input
                    id="subject"
                    placeholder="Quick follow-up"
                    value={form.subject}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="text">
                    Message
                  </label>
                  <textarea
                    id="text"
                    className="flex min-h-48 w-full rounded-lg border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    placeholder="Write your outreach email here..."
                    value={form.text}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, text: event.target.value }))
                    }
                  />
                </div>
                <Button className="w-full" disabled={submitting} type="submit">
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <SendHorizonal className="size-4" />
                      Send email
                    </>
                  )}
                </Button>
              </form>
              {(error || success) && (
                <div
                  className={cn(
                    "mt-4 rounded-lg border px-3 py-2 text-sm",
                    error
                      ? "border-destructive/30 bg-destructive/5 text-destructive"
                      : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
                  )}
                >
                  {error ?? success}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <Card className="min-h-[640px]">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mailbox className="size-4" />
                    Inbox and sent mail
                  </CardTitle>
                  <CardDescription>
                    Stored in Neon and refreshed from the API.
                  </CardDescription>
                </div>
                <Button disabled={loading} onClick={() => void loadEmails()} size="icon" variant="ghost">
                  <RefreshCcw className={cn("size-4", loading && "animate-spin")} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading emails...
                  </div>
                ) : emails.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                    No emails yet. Send one from the compose panel, then reply to your configured inbound address.
                  </div>
                ) : (
                  emails.map((email) => (
                    <button
                      key={email.id}
                      className={cn(
                        "w-full rounded-2xl border p-4 text-left transition-colors hover:bg-muted/50",
                        selectedEmail?.id === email.id && "border-primary bg-primary/5",
                      )}
                      onClick={() => setSelectedEmailId(email.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                            <span>{email.direction}</span>
                            <span>•</span>
                            <span>{email.status}</span>
                          </div>
                          <p className="font-medium">{email.subject || "(No subject)"}</p>
                          <p className="text-sm text-muted-foreground">
                            {email.direction === "inbound" ? email.fromEmail : email.toEmails.join(", ")}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(email.receivedAt ?? email.sentAt ?? email.createdAt)}
                        </span>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                        {getPreview(email)}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[640px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-4" />
                  Message detail
                </CardTitle>
                <CardDescription>
                  Full email body stored in Postgres for future threading and automation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedEmail ? (
                  <div className="space-y-5">
                    <div className="space-y-3 rounded-2xl border p-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Subject</p>
                        <p className="font-medium">{selectedEmail.subject || "(No subject)"}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-muted-foreground">From</p>
                          <p className="font-medium">{selectedEmail.fromEmail}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">To</p>
                          <p className="font-medium">{selectedEmail.toEmails.join(", ") || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Direction</p>
                          <p className="font-medium capitalize">{selectedEmail.direction}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Stored at</p>
                          <p className="font-medium">
                            {formatDate(
                              selectedEmail.receivedAt ??
                                selectedEmail.sentAt ??
                                selectedEmail.createdAt,
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <p className="mb-3 text-sm text-muted-foreground">Plain text body</p>
                      <div className="whitespace-pre-wrap text-sm leading-7">
                        {selectedEmail.textBody || getPreview(selectedEmail)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    Select an email to inspect its stored content.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
