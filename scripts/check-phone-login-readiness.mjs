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
    if (!(key in process.env)) process.env[key] = value;
  }
};

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profiles, error } = await supabase
  .from("profiles")
  .select("id,role,is_active,phone_number");

if (error) {
  console.error("Failed to query profiles:", error.message);
  process.exit(1);
}

const list = profiles || [];
const active = list.filter((p) => p.is_active);
const missingPhone = active.filter((p) => !p.phone_number);
const duplicated = new Map();

for (const profile of active) {
  if (!profile.phone_number) continue;
  const key = profile.phone_number;
  duplicated.set(key, (duplicated.get(key) || 0) + 1);
}

const duplicatePhones = [...duplicated.entries()].filter(([, count]) => count > 1);

console.log(`Total profiles: ${list.length}`);
console.log(`Active profiles: ${active.length}`);
console.log(`Active profiles missing phone_number: ${missingPhone.length}`);
console.log(`Duplicate phone_number values among active profiles: ${duplicatePhones.length}`);

if (missingPhone.length > 0) {
  console.log("Missing active profile phone_number details:");
  for (const profile of missingPhone) {
    const { data: userData, error: userError } =
      await supabase.auth.admin.getUserById(profile.id);
    const authPhone =
      userData?.user?.phone ||
      userData?.user?.user_metadata?.phone_number ||
      userData?.user?.user_metadata?.phone ||
      "";
    const authEmail = userData?.user?.email || "";
    const authError = userError?.message || "";

    console.log(
      JSON.stringify({
        id: profile.id,
        role: profile.role,
        email: authEmail,
        auth_phone: authPhone,
        auth_error: authError,
      }),
    );
  }
}

if (duplicatePhones.length > 0) {
  console.log("Duplicate phone_number values among active profiles:");
  for (const [phone, count] of duplicatePhones) {
    console.log(JSON.stringify({ phone_number: phone, count }));
  }
}

if (missingPhone.length > 0 || duplicatePhones.length > 0) {
  process.exit(2);
}
