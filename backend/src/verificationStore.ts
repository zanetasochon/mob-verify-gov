export type VerificationStatus = "PENDING" | "VERIFIED";

export interface VerificationResult {
  status: "TRUSTED" | "UNTRUSTED";
  endsWithGovPl: boolean;
  inRegistry: boolean;
  sslStatus: string;
}

interface StoredVerification {
  status: VerificationStatus;
  result?: VerificationResult;
}

const VERIFICATIONS = new Map<string, StoredVerification>();

export function setVerificationPending(token: string) {
  VERIFICATIONS.set(token, { status: "PENDING" });
}

export function setVerificationResult(
  token: string,
  result: VerificationResult
) {
  VERIFICATIONS.set(token, { status: "VERIFIED", result });
}

export function getVerification(token: string): StoredVerification | null {
  return VERIFICATIONS.get(token) ?? null;
}


