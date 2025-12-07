import express, { type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import { isTrustedGovDomain } from "./domainUtils";
import { createToken, getToken, markTokenUsed } from "./tokenStore";
import { checkSSL } from "./sslChecker";
import {
  getVerification,
  setVerificationPending,
  setVerificationResult,
} from "./verificationStore";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/is-trusted-domain", (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' in body" });
  }

  const result = isTrustedGovDomain(url);
  if (!result.valid) {
    return res.status(400).json({ error: "INVALID_URL" });
  }

  res.json(result);
});

app.post("/api/create-token", (req, res) => {
  const { url } = req.body as { url?: string };

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' in body" });
  }

  const domainCheck = isTrustedGovDomain(url);
  if (!domainCheck.valid) {
    return res.status(400).json({ error: "INVALID_URL" });
  }

  const tokenRecord = createToken({
    hostname: domainCheck.hostname!,
    url,
    isTrustedDomainCandidate: !!domainCheck.endsWithGovPl,
  });

  // Mark verification as pending so the widget can poll later
  setVerificationPending(tokenRecord.token);

  res.json({
    token: tokenRecord.token,
    expiresAt: tokenRecord.expiresAt,
    hostname: tokenRecord.hostname,
    endsWithGovPl: domainCheck.endsWithGovPl,
    inRegistry: domainCheck.inRegistry,
    isTrustedDomainCandidate: tokenRecord.isTrustedDomainCandidate,
  });
});

app.post("/api/verify-token", async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    return res.status(400).json({ error: "MISSING_TOKEN" });
  }

  const record = getToken(token);

  if (!record) {
    return res.status(404).json({ error: "TOKEN_NOT_FOUND" });
  }

  if (record.status === "EXPIRED") {
    return res.status(410).json({ error: "TOKEN_EXPIRED" });
  }

  if (record.status === "USED") {
    return res.status(409).json({ error: "TOKEN_ALREADY_USED" });
  }

  try {
    const domainCheck = isTrustedGovDomain(record.url);
    const sslCheck = await checkSSL(record.hostname);

    const status = domainCheck.isTrusted ? "TRUSTED" : "UNTRUSTED";

    setVerificationResult(token, {
      status,
      endsWithGovPl: !!domainCheck.endsWithGovPl,
      inRegistry: !!domainCheck.inRegistry,
      sslStatus: sslCheck.status,
    });

    markTokenUsed(token);

    return res.json({
      token: record.token,
      hostname: record.hostname,
      url: record.url,
      status,
      details: {
        endsWithGovPl: !!domainCheck.endsWithGovPl,
        inRegistry: !!domainCheck.inRegistry,
      },
      ssl: sslCheck,
    });
  } catch (e) {
    console.error("verify-token failed", e);
    return res.status(500).json({ error: "VERIFY_FAILED" });
  }
});

app.get("/api/token-status", (req, res) => {
  const token = req.query.token as string | undefined;

  if (!token) {
    return res.status(400).json({ error: "TOKEN_REQUIRED" });
  }

  const record = getToken(token);
  if (!record) {
    return res.status(404).json({ error: "TOKEN_NOT_FOUND" });
  }

  if (record.status === "EXPIRED") {
    return res.status(410).json({ error: "TOKEN_EXPIRED" });
  }

  const verification = getVerification(token);

  return res.json({
    token: record.token,
    hostname: record.hostname,
    url: record.url,
    verificationStatus: verification?.status ?? "PENDING",
    verificationResult: verification?.result ?? null,
  });
});

const mobywatelPath = path.resolve(__dirname, "..", "..", "mobywatel-demo");
console.log("Serving mObywatel frontend from:", mobywatelPath);

app.use(express.static(mobywatelPath));

app.get("/", (_req, res) => {
  res.sendFile(path.join(mobywatelPath, "index.html"));
});

const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Verify API running on http://localhost:${PORT}`);
});
