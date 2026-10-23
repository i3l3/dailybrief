import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
const hex = () => randomBytes(32).toString("hex");
const dbPassword = hex();
const content = `DATABASE_URL=postgresql://dailybrief:${dbPassword}@localhost:15432/dailybrief\nDB_PORT=15432\nPOSTGRES_PASSWORD=${dbPassword}\nAPP_URL=http://localhost:3000\nMASTER_KEY=${hex()}\nCOOKIE_SECURE=false\nGOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\nIMAP_ALLOWED_HOSTS=\n`;
try {
  await writeFile(new URL("../.env", import.meta.url), content, {
    flag: "wx",
    mode: 0o600,
  });
  console.log(
    "Created .env with unique local encryption and database secrets.",
  );
} catch (e) {
  if (e.code === "EEXIST") console.log(".env already exists; left unchanged.");
  else throw e;
}
