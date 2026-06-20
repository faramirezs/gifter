import { randomBytes } from "node:crypto";

export function mintOrderToken(): string {
  return randomBytes(32).toString("base64url");
}
