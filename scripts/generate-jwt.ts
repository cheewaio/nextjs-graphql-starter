import "dotenv/config";

import { signAccessToken } from "../src/lib/auth";

const username = process.argv[2] ?? "user@example.com";

async function main() {
  console.log(await signAccessToken(username));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
