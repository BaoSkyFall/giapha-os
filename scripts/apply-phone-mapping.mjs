import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const CONFIRM_TOKEN = "YES_I_UNDERSTAND";
const DEFAULT_MAPPING_FILE = "scripts/phone-mapping.template.json";
const E164_VIETNAM_PREFIX = "+84";

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

const normalizeVietnamPhone = (input) => {
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    throw new Error("Phone number is required.");
  }

  const hasLeadingPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");
  let nationalNumber = digitsOnly;

  if (hasLeadingPlus) {
    if (!trimmed.startsWith(E164_VIETNAM_PREFIX)) {
      throw new Error("Only Vietnam phone numbers (+84) are supported.");
    }
    nationalNumber = digitsOnly.slice(2);
  } else if (digitsOnly.startsWith("84")) {
    nationalNumber = digitsOnly.slice(2);
  } else if (digitsOnly.startsWith("0")) {
    nationalNumber = digitsOnly.slice(1);
  }

  if (!/^\d{9,10}$/.test(nationalNumber)) {
    throw new Error("Invalid phone number format.");
  }

  return `${E164_VIETNAM_PREFIX}${nationalNumber}`;
};

const parseArgs = () => {
  const execute = process.argv.includes("--execute");
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="));
  const confirmArg = process.argv.find((arg) => arg.startsWith("--confirm="));

  return {
    execute,
    filePath: fileArg ? fileArg.replace("--file=", "") : DEFAULT_MAPPING_FILE,
    confirmValue: confirmArg ? confirmArg.replace("--confirm=", "") : "",
  };
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

const { execute, filePath, confirmValue } = parseArgs();
const resolvedFilePath = path.resolve(process.cwd(), filePath);
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id,role,is_active,phone_number");

if (profilesError) {
  console.error("Failed to load profiles:", profilesError.message);
  process.exit(1);
}

const allProfiles = profiles || [];
const activeProfiles = allProfiles.filter((profile) => profile.is_active);
const missingActiveProfiles = activeProfiles.filter(
  (profile) => !profile.phone_number,
);

if (missingActiveProfiles.length === 0) {
  console.log("No active profiles are missing phone_number. Nothing to map.");
  process.exit(0);
}

const profileDetails = [];
for (const profile of missingActiveProfiles) {
  const { data: authUser, error: authError } =
    await supabase.auth.admin.getUserById(profile.id);

  profileDetails.push({
    id: profile.id,
    role: profile.role,
    email: authUser?.user?.email || "",
    auth_phone:
      authUser?.user?.phone ||
      authUser?.user?.user_metadata?.phone_number ||
      authUser?.user?.user_metadata?.phone ||
      "",
    auth_error: authError?.message || "",
  });
}

if (!execute) {
  const template = profileDetails.map((detail) => ({
    id: detail.id,
    role: detail.role,
    email: detail.email,
    phone_number: detail.auth_phone || "",
  }));

  fs.writeFileSync(resolvedFilePath, JSON.stringify(template, null, 2) + "\n");

  console.log(
    `Wrote mapping template for ${template.length} profiles to: ${filePath}`,
  );
  console.log("Fill missing phone_number values, then run:");
  console.log(
    `node scripts/apply-phone-mapping.mjs --execute --file=${filePath} --confirm=${CONFIRM_TOKEN}`,
  );

  process.exit(0);
}

if (confirmValue !== CONFIRM_TOKEN) {
  console.error(
    `Missing required --confirm=${CONFIRM_TOKEN} safety confirmation.`,
  );
  process.exit(1);
}

if (!fs.existsSync(resolvedFilePath)) {
  console.error(`Mapping file not found: ${filePath}`);
  process.exit(1);
}

let mappingsRaw;
try {
  mappingsRaw = JSON.parse(fs.readFileSync(resolvedFilePath, "utf8"));
} catch (error) {
  console.error(
    "Failed to parse mapping JSON file:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}

const mappingList = Array.isArray(mappingsRaw)
  ? mappingsRaw
  : Array.isArray(mappingsRaw?.mappings)
    ? mappingsRaw.mappings
    : null;

if (!mappingList) {
  console.error("Mapping file must be an array or an object with `mappings`.");
  process.exit(1);
}

const missingById = new Map(missingActiveProfiles.map((profile) => [profile.id, profile]));
const existingPhoneById = new Map(
  activeProfiles
    .filter((profile) => Boolean(profile.phone_number))
    .map((profile) => [profile.id, profile.phone_number]),
);

const normalizedById = new Map();
const parseErrors = [];

for (const item of mappingList) {
  const id = String(item?.id || "").trim();
  if (!id || !missingById.has(id)) continue;

  const phone = item?.phone_number;
  if (!phone) continue;

  try {
    normalizedById.set(id, normalizeVietnamPhone(phone));
  } catch (error) {
    parseErrors.push({
      id,
      reason: error instanceof Error ? error.message : String(error),
    });
  }
}

if (parseErrors.length > 0) {
  console.error("Invalid phone numbers detected in mapping file:");
  for (const issue of parseErrors) {
    console.error(`- ${issue.id}: ${issue.reason}`);
  }
  process.exit(1);
}

const missingMappings = [...missingById.keys()].filter(
  (id) => !normalizedById.has(id),
);

if (missingMappings.length > 0) {
  console.error(
    `Mapping file is incomplete. Missing ${missingMappings.length} active profile(s):`,
  );
  for (const id of missingMappings) {
    const detail = profileDetails.find((item) => item.id === id);
    console.error(
      `- ${id} role=${detail?.role || "unknown"} email=${detail?.email || "unknown"}`,
    );
  }
  process.exit(1);
}

const seenPhones = new Map();
for (const [id, normalizedPhone] of normalizedById.entries()) {
  const previousId = seenPhones.get(normalizedPhone);
  if (previousId && previousId !== id) {
    console.error(
      `Duplicate phone_number in mapping file: ${normalizedPhone} used by ${previousId} and ${id}`,
    );
    process.exit(1);
  }
  seenPhones.set(normalizedPhone, id);
}

for (const [id, normalizedPhone] of normalizedById.entries()) {
  for (const [otherId, otherPhone] of existingPhoneById.entries()) {
    if (id !== otherId && otherPhone === normalizedPhone) {
      console.error(
        `Conflict with existing profile phone_number: ${normalizedPhone} already assigned to ${otherId}`,
      );
      process.exit(1);
    }
  }
}

let success = 0;
let failed = 0;

for (const [id, normalizedPhone] of normalizedById.entries()) {
  const { error } = await supabase
    .from("profiles")
    .update({ phone_number: normalizedPhone })
    .eq("id", id);

  if (error) {
    failed += 1;
    console.error(`Failed to update ${id}: ${error.message}`);
    continue;
  }

  success += 1;
}

console.log(`Phone mapping complete. Updated: ${success}, Failed: ${failed}`);
if (failed > 0) {
  process.exit(2);
}
