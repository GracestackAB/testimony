#!/usr/bin/env node
/** Genererar JWT secret + anon/service_role-nycklar (Supabase-format). */
import crypto from "node:crypto";

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload, secret) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${header}.${body}.${sig}`;
}

const secret = crypto.randomBytes(32).toString("base64");
const now = Math.floor(Date.now() / 1000);
const exp = now + 10 * 365 * 24 * 3600;
const base = { iss: "supabase", iat: now, exp };

const anon = signJwt({ ...base, role: "anon", ref: "testimony-az" }, secret);
const service = signJwt({ ...base, role: "service_role", ref: "testimony-az" }, secret);

console.log(JSON.stringify({ JWT_SECRET: secret, ANON_KEY: anon, SERVICE_ROLE_KEY: service }, null, 2));
