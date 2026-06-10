// scripts/bench-members.mjs
// READ-ONLY benchmark for member name-search and tree-view data fetch.
//
// SAFETY CONTRACT (autoresearch, LOCAL/READ-ONLY guardrail):
//   - This script performs ONLY `.select()` reads. It NEVER inserts, updates,
//     deletes, upserts, or calls a mutating RPC. Do not add writes here.
//   - It may run against production (read-only timing) per explicit user decision.
//
// Usage:
//   node scripts/bench-members.mjs              # full benchmark
//   node scripts/bench-members.mjs --probe      # counts + sample names only (fastest)
//
// Output: prints a JSON report and writes it to
//   .omc/autoresearch/improve-member-search-and-tree-load/runs/run-0001/evaluations/

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ---- env loading (.env.local overrides .env) -------------------------------
function loadEnv() {
  const out = {};
  for (const file of [".env", ".env.local"]) {
    const p = join(ROOT, file);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  }
  return out;
}

// ---- replicate utils/textSearch.ts normalize + match (baseline parity) -----
const normalizeForSearch = (value) => {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
};
const matchesSearchQuery = (haystackParts, query) => {
  const nq = normalizeForSearch(query);
  if (!nq) return true;
  const hay = normalizeForSearch(
    haystackParts.filter((p) => p !== null && p !== undefined).map(String).join(" "),
  );
  return nq.split(" ").filter(Boolean).every((t) => hay.includes(t));
};

const SCAN_PAGE_SIZE = 1000;
const SEARCH_LIMIT = 60;

async function timeIt(fn) {
  const t0 = performance.now();
  const result = await fn();
  return { ms: +(performance.now() - t0).toFixed(1), result };
}

// CURRENT search baseline: page through ALL persons, JS-filter (route.ts:117-159)
async function baselineSearch(supabase, query) {
  const matchedIds = [];
  let from = 0;
  let rowsScanned = 0;
  let roundTrips = 0;
  while (matchedIds.length < SEARCH_LIMIT) {
    roundTrips++;
    const { data, error } = await supabase
      .from("persons")
      .select("id, full_name, birth_year, generation")
      .order("birth_year", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, from + SCAN_PAGE_SIZE - 1);
    if (error) throw error;
    const chunk = data ?? [];
    if (chunk.length === 0) break;
    rowsScanned += chunk.length;
    for (const c of chunk) {
      if (matchesSearchQuery([c.full_name, c.birth_year, c.generation], query)) {
        matchedIds.push(c.id);
        if (matchedIds.length >= SEARCH_LIMIT) break;
      }
    }
    if (chunk.length < SCAN_PAGE_SIZE) break;
    from += SCAN_PAGE_SIZE;
  }
  // second hydration query (route.ts:169)
  let hydrated = 0;
  if (matchedIds.length) {
    const { data, error } = await supabase.from("persons").select("*").in("id", matchedIds);
    if (error) throw error;
    hydrated = (data ?? []).length;
  }
  return { matched: matchedIds.length, rowsScanned, roundTrips, hydrated };
}

// CANDIDATE search: single server-side ilike query (no DDL, accent-SENSITIVE)
async function candidateIlikeSearch(supabase, rawQuery) {
  const q = rawQuery.trim().replace(/[%_]/g, "");
  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("persons")
    .select("*")
    .or(`full_name.ilike.${pattern},other_names.ilike.${pattern}`)
    .limit(SEARCH_LIMIT);
  if (error) throw error;
  return { matched: (data ?? []).length };
}

// CURRENT tree fetch baseline: ALL persons (*) + ALL relationships (page.tsx:255-290)
async function baselineTreeFetch(supabase) {
  const persons = [];
  let pFrom = 0;
  let pRT = 0;
  while (true) {
    pRT++;
    const { data, error } = await supabase
      .from("persons")
      .select("*")
      .order("birth_year", { ascending: true, nullsFirst: false })
      .range(pFrom, pFrom + SCAN_PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    persons.push(...data);
    if (data.length < SCAN_PAGE_SIZE) break;
    pFrom += SCAN_PAGE_SIZE;
  }
  const rels = [];
  let rFrom = 0;
  let rRT = 0;
  while (true) {
    rRT++;
    const { data, error } = await supabase
      .from("relationships")
      .select("*")
      .range(rFrom, rFrom + SCAN_PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rels.push(...data);
    if (data.length < SCAN_PAGE_SIZE) break;
    rFrom += SCAN_PAGE_SIZE;
  }
  return { persons: persons.length, relationships: rels.length, personRoundTrips: pRT, relRoundTrips: rRT };
}

// CANDIDATE tree fetch: parallel paged fetch of persons + relationships
async function optimizedTreeFetch(supabase) {
  const fetchAll = async (table, applyOrder) => {
    const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
    const total = count ?? 0;
    if (total === 0) return [];
    const pages = Math.ceil(total / SCAN_PAGE_SIZE);
    const results = await Promise.all(
      Array.from({ length: pages }, (_, i) =>
        applyOrder(supabase.from(table).select("*")).range(
          i * SCAN_PAGE_SIZE,
          i * SCAN_PAGE_SIZE + SCAN_PAGE_SIZE - 1,
        ),
      ),
    );
    const rows = [];
    for (const r of results) if (r.data) rows.push(...r.data);
    return rows;
  };
  const [persons, rels] = await Promise.all([
    fetchAll("persons", (q) =>
      q.order("birth_year", { ascending: true, nullsFirst: false }).order("id", { ascending: true }),
    ),
    fetchAll("relationships", (q) =>
      q.order("person_a", { ascending: true }).order("person_b", { ascending: true }).order("type", { ascending: true }),
    ),
  ]);
  return { persons: persons.length, relationships: rels.length };
}

// Simulate the SQL `name_search` generated column using the SAME JS normalizer.
// (SQL f_name_search_norm mirrors normalizeForSearch; the only residual gap is
// Postgres unaccent vs JS NFD-strip, which agrees for Vietnamese text.)
const simulateNameSearch = (p) =>
  normalizeForSearch(
    [p.full_name, p.birth_year, p.generation].filter((x) => x !== null && x !== undefined).join(" "),
  );

// Verify the new fast-path model (token ILIKE on name_search) returns EXACTLY
// the same rows as the current matchesSearchQuery JS scan, over real data.
async function verifyEquivalence(supabase, queries) {
  const all = [];
  let from = 0;
  while (true) {
    const { data } = await supabase
      .from("persons")
      .select("id, full_name, birth_year, generation")
      .range(from, from + SCAN_PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < SCAN_PAGE_SIZE) break;
    from += SCAN_PAGE_SIZE;
  }
  const results = [];
  for (const q of queries) {
    const tokens = normalizeForSearch(q).split(" ").filter(Boolean);
    let mismatches = 0;
    let baselineCount = 0;
    let fastCount = 0;
    for (const p of all) {
      const baseline = matchesSearchQuery([p.full_name, p.birth_year, p.generation], q);
      const hay = simulateNameSearch(p);
      const fast = tokens.every((t) => hay.includes(t));
      if (baseline) baselineCount++;
      if (fast) fastCount++;
      if (baseline !== fast) mismatches++;
    }
    results.push({ query: q, rows: all.length, baselineCount, fastCount, mismatches });
  }
  return results;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase key in .env/.env.local");
    process.exit(2);
  }
  const probeOnly = process.argv.includes("--probe");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.error(`[bench] target=${url} mode=${probeOnly ? "probe" : "full"} (READ-ONLY)`);

  // counts (head + exact count, read-only)
  const { count: personCount, error: pcErr } = await supabase
    .from("persons").select("*", { count: "exact", head: true });
  if (pcErr) { console.error("count persons failed:", pcErr.message); process.exit(1); }
  const { count: relCount } = await supabase
    .from("relationships").select("*", { count: "exact", head: true });

  // sample names → derive realistic single-token queries
  const { data: sampleRows } = await supabase
    .from("persons").select("full_name").limit(50);
  const tokens = [];
  for (const r of sampleRows ?? []) {
    const parts = normalizeForSearch(r.full_name).split(" ").filter(Boolean);
    if (parts.length) tokens.push(parts[parts.length - 1]); // given-name token
  }
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] ?? 0) + 1;
  const sampleQueries = [...new Set(tokens)].sort((a, b) => freq[b] - freq[a]).slice(0, 3);

  const report = {
    iteration: 1,
    target: url,
    mode: probeOnly ? "probe" : "full",
    readOnly: true,
    counts: { persons: personCount, relationships: relCount },
    sampleQueries,
  };

  if (process.argv.includes("--verify")) {
    const queries = [...sampleQueries, "pham", "pham phu", "1990", "thi", "van"];
    report.equivalence = await verifyEquivalence(supabase, queries);
    const totalMismatch = report.equivalence.reduce((a, r) => a + r.mismatches, 0);
    report.equivalence_ok = totalMismatch === 0;
    console.log(JSON.stringify(report, null, 2));
    console.error(`[bench] equivalence mismatches: ${totalMismatch}`);
    return;
  }

  if (!probeOnly && sampleQueries.length) {
    report.search = [];
    for (const q of sampleQueries) {
      const base = await timeIt(() => baselineSearch(supabase, q));
      const cand = await timeIt(() => candidateIlikeSearch(supabase, q));
      report.search.push({
        query: q,
        baseline_ms: base.ms,
        baseline: base.result,
        candidate_ilike_ms: cand.ms,
        candidate: cand.result,
        speedup: base.ms && cand.ms ? +(base.ms / cand.ms).toFixed(1) : null,
      });
    }
    const tree = await timeIt(() => baselineTreeFetch(supabase));
    const treeOpt = await timeIt(() => optimizedTreeFetch(supabase));
    report.tree = {
      baseline_fetch_ms: tree.ms,
      optimized_fetch_ms: treeOpt.ms,
      speedup: tree.ms && treeOpt.ms ? +(tree.ms / treeOpt.ms).toFixed(1) : null,
      ...tree.result,
    };
  }

  const outDir = join(
    ROOT,
    ".omc/autoresearch/improve-member-search-and-tree-load/runs/run-0001/evaluations",
  );
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `iteration-0001${probeOnly ? "-probe" : ""}.json`);
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.error(`[bench] wrote ${outFile}`);
}

main().catch((e) => {
  console.error("[bench] error:", e?.message ?? e);
  process.exit(1);
});
