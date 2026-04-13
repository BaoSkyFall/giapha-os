import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const loadEnvFile = (filepath) => {
  if (!fs.existsSync(filepath)) return;
  const lines = fs.readFileSync(filepath, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) continue;

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Aborting.",
  );
  process.exit(1);
}

const execute = process.argv.includes("--execute");
const allowProd = process.argv.includes("--allow-prod");
const confirmArg = process.argv.find((arg) => arg.startsWith("--confirm="));
const confirmValue = confirmArg ? confirmArg.replace("--confirm=", "") : "";
const defaultPassword = "000000";
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: profiles, error: profileError } = await supabase
  .from("profiles")
  .select("id,role,phone_number")
  .neq("role", "admin");

if (profileError) {
  console.error("Failed to query non-admin profiles:", profileError.message);
  process.exit(1);
}

const users = profiles || [];
console.log(`Found ${users.length} non-admin users.`);

const missingPhone = users.filter((u) => !u.phone_number);
if (missingPhone.length > 0) {
  console.error(
    `Aborting. ${missingPhone.length} non-admin users do not have phone_number mapped.`,
  );
  process.exit(1);
}

const uniquePhoneCount = new Set(users.map((u) => u.phone_number)).size;
if (uniquePhoneCount !== users.length) {
  console.error(
    "Aborting. Duplicate phone_number detected among non-admin users.",
  );
  process.exit(1);
}

if (!execute) {
  console.log(
    "Dry-run only. Re-run with --execute --confirm=YES_I_UNDERSTAND to set password 000000 for all non-admin users.",
  );
  process.exit(0);
}

const envName = process.env.VERCEL_ENV || process.env.NODE_ENV || "unknown";
const isProd = envName === "production";
if (isProd && !allowProd) {
  console.error(
    "Refusing to run in production without --allow-prod. Re-run with explicit approval flags.",
  );
  process.exit(1);
}

if (confirmValue !== "YES_I_UNDERSTAND") {
  console.error(
    "Missing required --confirm=YES_I_UNDERSTAND safety confirmation.",
  );
  process.exit(1);
}

let success = 0;
let failed = 0;

for (const profile of users) {
  const { error } = await supabase.auth.admin.updateUserById(profile.id, {
    password: defaultPassword,
  });

  if (error) {
    failed += 1;
    console.error(`Failed for user ${profile.id}: ${error.message}`);
    continue;
  }

  success += 1;
}

console.log(`Migration complete. Updated: ${success}, Failed: ${failed}`);
if (failed > 0) process.exit(2);
