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
 * Sprawdza certyfikat SSL dla danego hosta (port 443).
 * Nie ufamy mu „na słowo” – korzystamy z wbudowanej w Node listy CA.
 */
export function checkSSL(hostname: string): Promise<SSLCheckResult> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        // chcemy móc odczytać cert nawet gdy jest nieprawidłowy
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

        // brak certyfikatu
        if (!hasCert) {
          socket.end();
          return resolve({
            ...base,
            status: "NO_SSL",
            authorized: false,
          });
        }

        // Node mówi, że cert jest nieautoryzowany (expired, self-signed, wrong host itp.)
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
