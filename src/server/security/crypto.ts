import "server-only";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { env } from "../env";

export const sha256 = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

/** HMAC com o segredo da aplicação — usado para pseudonimizar IPs em chaves de rate limit. */
export const hmac = (value: string) => createHmac("sha256", env().APP_SECRET).update(value).digest("hex").slice(0, 32);

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
