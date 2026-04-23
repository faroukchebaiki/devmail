const requiredServerEnv = ["DATABASE_URL", "RESEND_API_KEY", "MAIL_FROM"] as const;

type RequiredServerEnvKey = (typeof requiredServerEnv)[number];

export function getRequiredEnv(name: RequiredServerEnvKey) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string) {
  const value = process.env[name];

  return value && value.length > 0 ? value : undefined;
}

export function getPublicMailConfig() {
  return {
    defaultFrom: getOptionalEnv("MAIL_FROM") ?? "Outbound <onboarding@resend.dev>",
    inboundAddress:
      getOptionalEnv("RESEND_INBOUND_ADDRESS") ??
      "Set RESEND_INBOUND_ADDRESS to show your inbound reply address.",
  };
}
