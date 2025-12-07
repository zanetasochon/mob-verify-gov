import tls from "tls";

export type SSLAuthStatus = "OK" | "INVALID" | "NO_SSL" | "ERROR";

export interface SSLCheckResult {
  status: SSLAuthStatus;
  authorized: boolean;
  authorizationError?: string;
  hasCertificate: boolean;
  validFrom?: string;
  validTo?: string;
  subjectCN?: string;
  issuerCN?: string;
}

/**
 * Checks the SSL certificate for the given host (port 443).
 * Uses Node's built-in CA list instead of trusting the host blindly.
 */
export function checkSSL(hostname: string): Promise<SSLCheckResult> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        // Allow reading the certificate even when it is invalid
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate();
        const hasCert = cert && Object.keys(cert).length > 0;
        const authorized = socket.authorized;
        const authorizationError = socket.authorizationError
          ? String(socket.authorizationError)
          : undefined;

        const base: SSLCheckResult = {
          hasCertificate: hasCert,
          authorized,
          authorizationError,
          validFrom: hasCert ? cert.valid_from : undefined,
          validTo: hasCert ? cert.valid_to : undefined,
          subjectCN: hasCert ? cert.subject?.CN : undefined,
          issuerCN: hasCert ? cert.issuer?.CN : undefined,
          status: "OK",
        };

        // No certificate was presented
        if (!hasCert) {
          socket.end();
          return resolve({
            ...base,
            status: "NO_SSL",
            authorized: false,
          });
        }

        // Node reports the certificate as unauthorized (expired, self-signed, wrong host, etc.)
        if (!authorized) {
          socket.end();
          return resolve({
            ...base,
            status: "INVALID",
          });
        }

        socket.end();
        return resolve({
          ...base,
          status: "OK",
        });
      }
    );

    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve({
        status: "ERROR",
        authorized: false,
        hasCertificate: false,
        authorizationError: "TIMEOUT",
      });
    });

    socket.on("error", (err) => {
      resolve({
        status: "ERROR",
        authorized: false,
        hasCertificate: false,
        authorizationError: err.message,
      });
    });
  });
}
