import { listEmails } from "@/lib/mail-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const emails = await listEmails();

  return Response.json({
    emails,
  });
}
