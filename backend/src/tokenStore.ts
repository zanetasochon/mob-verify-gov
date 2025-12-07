import { randomUUID } from "crypto";

export interface TokenRecord {
  token: string;
  hostname: string;
  url: string;
  createdAt: Date;
  expiresAt: Date;
  isTrustedDomainCandidate: boolean;
  used: boolean;
}

export interface CreateTokenInput {
  hostname: string;
  url: string;
  isTrustedDomainCandidate: boolean;
}

export type TokenStatus = "ACTIVE" | "EXPIRED" | "USED";

export type TokenWithStatus = TokenRecord & { status: TokenStatus };

const TOKENS = new Map<string, TokenRecord>();

// Token is valid for 5 minutes by default
const TOKEN_TTL_MS = 5 * 60 * 1000;

export function createToken(input: CreateTokenInput): TokenRecord {
  const now = new Date();
  const token = randomUUID();
  const record: TokenRecord = {
    token,
    hostname: input.hostname,
    url: input.url,
    createdAt: now,
    expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
    isTrustedDomainCandidate: input.isTrustedDomainCandidate,
    used: false,
  };

  TOKENS.set(token, record);
  return record;
}

export function getToken(token: string): TokenWithStatus | null {
  const record = TOKENS.get(token);
  if (!record) {
    return null;
  }

  const now = Date.now();
  const expired = record.expiresAt.getTime() < now;

  let status: TokenStatus = "ACTIVE";
  if (record.used) {
    status = "USED";
  } else if (expired) {
    status = "EXPIRED";
  }

  return { ...record, status };
}

export function markTokenUsed(token: string): void {
  const record = TOKENS.get(token);
  if (!record) {
    return;
  }

  record.used = true;
  TOKENS.set(token, record);
}

