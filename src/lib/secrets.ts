import { query } from "./db";
import { encrypt, decrypt } from "./crypto";
export const secretNames = [
  "aiKey",
  "neisKey",
  "kisKey",
  "kisSecret",
  "nvdKey",
] as const;
export async function getSecret(name: string) {
  const { rows } = await query("SELECT ciphertext FROM secrets WHERE name=$1", [
    name,
  ]);
  return rows[0] ? decrypt<string>(rows[0].ciphertext) : "";
}
export async function setSecret(name: string, value: string) {
  if (!value) return;
  await query(
    "INSERT INTO secrets(name,ciphertext) VALUES($1,$2) ON CONFLICT(name) DO UPDATE SET ciphertext=$2",
    [name, encrypt(value)],
  );
}
