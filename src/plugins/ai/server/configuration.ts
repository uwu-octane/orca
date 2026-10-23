import type { AiProviderScope } from "../contracts";
import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import { AiProviderConfigRepository } from "./AiProviderConfigRepository";
import { AppError } from "@/server/lib/errors";
import { normalizeAndValidateStartUrl } from "@/server/lib/audit/url-policy";
import {
  getOptionalEnvValue,
  isHostedServerAuthMode,
} from "@/server/lib/runtime-env";
import { MIN_BETTER_AUTH_SECRET_LENGTH } from "@/shared/selfhost-checks";
import {
  AI_PROVIDERS,
  aiProviderConfigSchema,
  saveAiProviderConfigSchema,
  type AiProvider,
  type AiProviderConfig,
  type AiProviderConfigSummary,
  type SaveAiProviderConfig,
} from "@/types/schemas/ai-provider";

async function encryptionKey() {
  const key = (await getOptionalEnvValue("BETTER_AUTH_SECRET"))?.trim();
  if (!key || key.length < MIN_BETTER_AUTH_SECRET_LENGTH)
    throw new AppError("AUTH_CONFIG_MISSING");
  return key;
}

async function validateEndpoint(config: AiProviderConfig) {
  const url = new URL(config.endpoint);
  if (config.provider !== "systemone") {
    const endpoint = AI_PROVIDERS[config.provider].endpoint;
    if (url.href !== new URL(endpoint).href)
      throw new AppError("AI_PROVIDER_CONFIG_INVALID");
    return;
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !url.pathname.endsWith("/v1/systemone")
  )
    throw new AppError("AI_PROVIDER_CONFIG_INVALID");

  // Self-host administrators explicitly configure local inference. Only literal
  // loopback/RFC1918/ULA addresses (or localhost) bypass public crawl URL policy;
  // cloud metadata, link-local addresses and redirects never do.
  const host = url.hostname;
  const privateIpv4 =
    /^\d+\.\d+\.\d+\.\d+$/.test(host) &&
    (host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host));
  const privateHost =
    host === "localhost" ||
    host === "[::1]" ||
    privateIpv4 ||
    /^\[f[cd][\da-f]{2}:/.test(host);
  const hosted = await isHostedServerAuthMode();
  if (hosted) {
    // Hosted tenants cannot turn the service into a general server-side proxy.
    const allowed =
      (await getOptionalEnvValue("DECISION_ALLOWED_ORIGINS"))
        ?.split(",")
        .map((value) => value.trim()) ?? [];
    if (!allowed.includes(url.origin) || privateHost)
      throw new AppError("AI_PROVIDER_CONFIG_INVALID");
  }
  if (!hosted && privateHost && ["http:", "https:"].includes(url.protocol))
    return;
  if (url.protocol !== "https:")
    throw new AppError("AI_PROVIDER_CONFIG_INVALID");
  try {
    await normalizeAndValidateStartUrl(url.href);
  } catch {
    throw new AppError("AI_PROVIDER_CONFIG_INVALID");
  }
}

function summary(
  row: NonNullable<Awaited<ReturnType<typeof AiProviderConfigRepository.get>>>,
): AiProviderConfigSummary {
  return {
    ...aiProviderConfigSchema.parse({
      provider: row.provider,
      endpoint: row.endpoint,
      timeoutMs: row.timeoutMs,
    }),
    hasApiKey: row.encryptedApiKey !== null,
    revision: row.revision,
    keyName: row.keyName,
    keyLastFour: row.keyLastFour,
    keyAddedAt: row.keyAddedAt,
    lastUsedAt: row.lastUsedAt,
  };
}

async function getConfig(scope: AiProviderScope, provider: AiProvider) {
  const row = await AiProviderConfigRepository.get(scope, provider);
  return row ? summary(row) : null;
}

async function saveConfig(raw: SaveAiProviderConfig, scope: AiProviderScope) {
  const input = saveAiProviderConfigSchema.parse(raw);
  if (
    input.projectId !== scope.projectId ||
    !(await AiProviderConfigRepository.hasProject(scope))
  )
    throw new AppError("NOT_FOUND");
  await validateEndpoint(input);
  const previous = await AiProviderConfigRepository.get(scope, input.provider);
  if ((previous?.revision ?? null) !== input.revision)
    throw new AppError("CONFLICT");

  let encryptedApiKey: string | null = null;
  if (input.credential.action === "keep") {
    // Never replay an old credential to a newly selected endpoint/provider.
    if (
      !previous ||
      previous.provider !== input.provider ||
      previous.endpoint !== input.endpoint
    )
      throw new AppError("AI_PROVIDER_CONFIG_INVALID");
    encryptedApiKey = previous.encryptedApiKey;
  } else if (input.credential.action === "replace") {
    encryptedApiKey = await symmetricEncrypt({
      key: await encryptionKey(),
      data: input.credential.value,
    });
  }
  if (input.provider !== "systemone" && !encryptedApiKey)
    throw new AppError("AI_PROVIDER_CONFIG_INVALID");
  const replacing = input.credential.action === "replace";
  const saved = await AiProviderConfigRepository.save(
    scope,
    {
      projectId: scope.projectId,
      provider: input.provider,
      endpoint: input.endpoint,
      timeoutMs: input.timeoutMs,
      encryptedApiKey,
      keyName:
        input.credential.action === "clear"
          ? null
          : (input.credential.name ?? previous?.keyName ?? null),
      // Short custom credentials must never be returned in full as a suffix.
      keyLastFour:
        input.credential.action === "replace"
          ? input.credential.value.length > 8
            ? input.credential.value.slice(-4)
            : null
          : input.credential.action === "keep"
            ? previous.keyLastFour
            : null,
      keyAddedAt: replacing
        ? new Date().toISOString()
        : input.credential.action === "keep"
          ? previous.keyAddedAt
          : null,
      ...(input.credential.action !== "keep" ? { lastUsedAt: null } : {}),
      revision: crypto.randomUUID(),
    },
    input.revision,
  );
  if (saved.length === 0) throw new AppError("CONFLICT");
  return getConfig(scope, input.provider);
}

async function removeConfig(
  scope: AiProviderScope,
  provider: AiProvider,
  revision: string,
) {
  if (
    (await AiProviderConfigRepository.remove(scope, provider, revision))
      .length === 0
  )
    throw new AppError("CONFLICT");
}

async function resolve(scope: AiProviderScope, provider: AiProvider) {
  const row = await AiProviderConfigRepository.get(scope, provider);
  if (!row) throw new AppError("AI_PROVIDER_NOT_CONFIGURED");
  await validateEndpoint(row);
  let apiKey: string | undefined;
  if (row.encryptedApiKey) {
    const key = await encryptionKey();
    try {
      apiKey = await symmetricDecrypt({ key, data: row.encryptedApiKey });
    } catch {
      throw new AppError("AI_PROVIDER_CONFIG_INVALID");
    }
  }
  return { ...summary(row), apiKey };
}

async function recordUse(
  scope: AiProviderScope,
  provider: AiProvider,
  revision: string,
) {
  // Reject a stale/deleted connection before sending a paid request. A request
  // already sent cannot be recalled; upstream revocation belongs to the provider.
  if (
    (await AiProviderConfigRepository.recordUse(scope, provider, revision))
      .length === 0
  )
    throw new AppError("CONFLICT");
}

export const configuration = {
  recordUse,
  getConfig,
  saveConfig,
  removeConfig,
  resolve,
} as const;
