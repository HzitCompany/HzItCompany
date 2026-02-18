import jwt, { type Algorithm } from "jsonwebtoken";

type JwksKey = {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  x5c?: string[];
};

type JwksResponse = {
  keys: JwksKey[];
};

type DecodedComplete = {
  header: { kid?: string; alg?: string };
  payload: any;
};

type VerifiedSupabaseToken = {
  sub: string;
  email?: string;
  phone?: string;
  provider?: string;
  iss?: string;
};

const jwksCache = new Map<string, { fetchedAt: number; keys: JwksKey[] }>();
const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour

function toPemFromX5c(cert: string) {
  const wrapped = cert.match(/.{1,64}/g)?.join("\n") ?? cert;
  return `-----BEGIN CERTIFICATE-----\n${wrapped}\n-----END CERTIFICATE-----\n`;
}

function getProjectBaseFromIss(iss?: string): string | null {
  if (!iss) return null;
  try {
    const url = new URL(iss);
    // Supabase issuer is usually: https://<ref>.supabase.co/auth/v1
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

async function fetchJwks(projectBase: string): Promise<JwksKey[]> {
  const cached = jwksCache.get(projectBase);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < JWKS_TTL_MS) return cached.keys;

  const res = await fetch(`${projectBase}/auth/v1/certs`, {
    method: "GET",
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS (${res.status})`);
  }

  const json = (await res.json()) as JwksResponse;
  const keys = Array.isArray(json?.keys) ? json.keys : [];
  jwksCache.set(projectBase, { fetchedAt: now, keys });
  return keys;
}

export async function verifySupabaseJwtViaJwks(token: string): Promise<VerifiedSupabaseToken> {
  const decoded = jwt.decode(token, { complete: true }) as DecodedComplete | null;
  if (!decoded?.payload) throw new Error("Invalid token");

  const algRaw = String(decoded.header?.alg ?? "");
  const alg = (algRaw || undefined) as Algorithm | undefined;
  const kid = decoded.header?.kid;
  const iss = decoded.payload?.iss as string | undefined;
  const projectBase = getProjectBaseFromIss(iss);

  if (!projectBase) throw new Error("Missing iss");
  if (!kid) {
    // HS256 tokens often don't carry kid, so JWKS can't be used.
    throw new Error(`Missing kid (alg=${algRaw || "unknown"})`);
  }

  // JWKS validation only makes sense for asymmetric algorithms.
  // If we see HS256, the backend must validate via Supabase Auth (auth.getUser) using the correct project keys.
  if (algRaw && !algRaw.startsWith("RS") && !algRaw.startsWith("ES")) {
    throw new Error(`Unsupported alg for JWKS (${algRaw})`);
  }

  const keys = await fetchJwks(projectBase);
  const key = keys.find((k) => k.kid === kid);
  const cert = key?.x5c?.[0];
  if (!cert) throw new Error("No matching JWKS cert");

  const pem = toPemFromX5c(cert);
  const verified = jwt.verify(token, pem, {
    algorithms: alg ? [alg] : (["RS256"] as Algorithm[]),
    issuer: iss,
  }) as any;

  return {
    sub: String(verified.sub),
    email: typeof verified.email === "string" ? verified.email : undefined,
    phone: typeof verified.phone === "string" ? verified.phone : undefined,
    provider: typeof verified?.app_metadata?.provider === "string" ? verified.app_metadata.provider : undefined,
    iss,
  };
}
