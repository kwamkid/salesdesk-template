#!/usr/bin/env node
// Upload demo media (project covers, site plan image, visit photos, house model
// pictures, third-project cover) to Supabase
// Storage and link them to the seeded demo rows. Idempotent: safe to re-run.
//
// Usage (from the project root, after the demo seed has been loaded):
//   node scripts/upload-demo-media.mjs
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PROJECT_1 = 'e0000000-0000-4000-8000-000000000001';
const PROJECT_2 = 'e0000000-0000-4000-8000-000000000002';
const SITE_PLAN_1 = 'e1000000-0000-4000-8000-000000000001';
const HOUSE_MODELS = [
  ['e4000000-0000-4000-8000-000000000001', PROJECT_1, 'ivy'],
  ['e4000000-0000-4000-8000-000000000002', PROJECT_1, 'oak'],
  ['e4000000-0000-4000-8000-000000000003', PROJECT_1, 'fern'],
  ['e4000000-0000-4000-8000-000000000004', PROJECT_2, 'lotus'],
  ['e4000000-0000-4000-8000-000000000005', PROJECT_2, 'lily'],
];
const PROJECT_3_NAME = 'บ้านทดสอบ บางนา';
const VISIT_PHOTOS = [1, 2, 3, 4, 5, 6].map((n) => `public/samples/visits/visit-${n}.jpg`);

async function loadEnv() {
  let text;
  try {
    text = await readFile(path.join(root, '.env.local'), 'utf8');
  } catch {
    fail('.env.local not found in project root');
  }
  const env = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const env = await loadEnv();
const BASE = (env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
const SECRET = env.SUPABASE_SECRET_KEY || '';
if (!BASE) fail('NEXT_PUBLIC_SUPABASE_URL is missing in .env.local');
if (!SECRET) fail('SUPABASE_SECRET_KEY is missing in .env.local');

const authHeaders = { apikey: SECRET, Authorization: `Bearer ${SECRET}` };

// Never let the key leak into error output.
function scrub(text) {
  return String(text).split(SECRET).join('***');
}

async function request(method, url, { headers = {}, body } = {}) {
  let res;
  try {
    res = await fetch(url, { method, headers: { ...authHeaders, ...headers }, body });
  } catch (err) {
    fail(`${method} ${url} failed: ${scrub(err.message)}`);
  }
  const text = await res.text();
  if (!res.ok) fail(`${method} ${url} -> HTTP ${res.status}: ${scrub(text)}`);
  return text ? JSON.parse(text) : null;
}

// Like patch(), but a missing table or no matching row is reported, not fatal.
// Returns the number of rows updated (0 when nothing matched).
async function softPatch(table, filter, values) {
  let res;
  try {
    res = await fetch(`${BASE}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(values),
    });
  } catch (err) {
    fail(`PATCH ${table}?${filter} failed: ${scrub(err.message)}`);
  }
  const text = await res.text();
  if (!res.ok) {
    console.warn(`  skip: PATCH ${table}?${filter} -> HTTP ${res.status}: ${scrub(text)}`);
    return 0;
  }
  const rows = text ? JSON.parse(text) : [];
  return Array.isArray(rows) ? rows.length : 0;
}

async function upload(bucket, objectPath, localFile) {
  const ext = path.extname(localFile).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';
  const data = await readFile(path.join(root, localFile));
  await request('POST', `${BASE}/storage/v1/object/${bucket}/${objectPath}`, {
    headers: { 'Content-Type': contentType, 'x-upsert': 'true' },
    body: data,
  });
}

async function patch(table, filter, values) {
  const rows = await request('PATCH', `${BASE}/rest/v1/${table}?${filter}`, {
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(values),
  });
  if (!Array.isArray(rows) || rows.length === 0) {
    fail(`PATCH ${table}?${filter} matched no rows (is the demo seed loaded?)`);
  }
  return rows.length;
}

// 1. Project covers
const covers = [
  [PROJECT_1, 'public/samples/project-1.jpg'],
  [PROJECT_2, 'public/samples/project-2.jpg'],
];
for (const [projectId, file] of covers) {
  const objectPath = `${projectId}/cover-demo.jpg`;
  await upload('project-images', objectPath, file);
  await patch('projects', `id=eq.${projectId}`, { cover_path: objectPath });
}

// 2. Site plan image
const planPath = `${PROJECT_1}/${SITE_PLAN_1}-demo.png`;
await upload('site-plans', planPath, 'docs/samples/site-plan-sample.png');
await patch('site_plans', `id=eq.${SITE_PLAN_1}`, { image_path: planPath, image_w: 1024, image_h: 725 });

// 3. Visit photos (round robin over visit-1..6.jpg)
const visits = await request(
  'GET',
  `${BASE}/rest/v1/activities?select=id,lead_id,leads!inner(project_id)&type=eq.visit` +
    `&leads.project_id=in.(${PROJECT_1},${PROJECT_2})&order=id`,
);
let i = 0;
for (const a of visits) {
  const objectPath = `${a.lead_id}/${a.id}.jpg`;
  await upload('visit-photos', objectPath, VISIT_PHOTOS[i % VISIT_PHOTOS.length]);
  await patch('activities', `id=eq.${a.id}`, { photo_path: objectPath });
  i++;
}

// 4. House model pictures (table comes from migration 0010; skip rows that are not there yet)
let modelsLinked = 0;
for (const [modelId, projectId, name] of HOUSE_MODELS) {
  const objectPath = `${projectId}/models/${modelId}-demo.jpg`;
  await upload('project-images', objectPath, `public/samples/houses/${name}.jpg`);
  const n = await softPatch('house_models', `id=eq.${modelId}`, { image_path: objectPath });
  if (n === 0) {
    console.warn(`  house model ${name} (${modelId}) not found - picture uploaded but not linked (is migration 0010 applied?)`);
  } else {
    modelsLinked += n;
  }
}

// 5. Third (test) project cover, looked up by name
const project3 = await request(
  'GET',
  `${BASE}/rest/v1/projects?name=eq.${encodeURIComponent(PROJECT_3_NAME)}&select=id`,
);
let project3Covers = 0;
if (!Array.isArray(project3) || project3.length === 0) {
  console.warn(`  project "${PROJECT_3_NAME}" not found - skipping its cover`);
} else {
  for (const p of project3) {
    const objectPath = `${p.id}/cover-demo.jpg`;
    await upload('project-images', objectPath, 'public/samples/project-3.jpg');
    await patch('projects', `id=eq.${p.id}`, { cover_path: objectPath });
    project3Covers++;
  }
}

console.log('Demo media uploaded:');
console.log(`  project covers: ${covers.length}`);
console.log('  site plans:     1');
console.log(`  visit photos:   ${visits.length}`);
console.log(`  house models:   ${modelsLinked}/${HOUSE_MODELS.length} linked`);
console.log(`  project 3 cover: ${project3Covers}`);
