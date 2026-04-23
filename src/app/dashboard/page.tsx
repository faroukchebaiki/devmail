import { EmailDashboard } from "@/components/email-dashboard";
import { getPublicMailConfig } from "@/lib/env";

export default function Page() {
  const config = getPublicMailConfig();

  return (
    <EmailDashboard
      defaultFrom={config.defaultFrom}
      inboundAddress={config.inboundAddress}
    />
  );
}
