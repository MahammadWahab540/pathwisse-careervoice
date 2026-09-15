import fs from 'node:fs';

const path = new URL('../server.ts', import.meta.url);
let source = fs.readFileSync(path, 'utf8');

const importLine = "import { registerInstitutionRoutes } from './src/server/institutionRoutes';";
const anchorImport = "import { getSupabase, requireSupabase } from './src/lib/supabase';";
const middlewareAnchor = "app.use(express.json({ limit: '10mb' }));";
const mountBlock = `\n\n// Institution onboarding and placement APIs must be mounted before SPA fallbacks.\nconst institutionSupabase = getSupabase();\nif (institutionSupabase) {\n  registerInstitutionRoutes(app, institutionSupabase);\n} else {\n  console.warn('institution_routes_disabled', { reason: 'SUPABASE_NOT_CONFIGURED' });\n}`;

if (!source.includes(importLine)) {
  if (!source.includes(anchorImport)) throw new Error('Could not locate Supabase import anchor in server.ts');
  source = source.replace(anchorImport, `${anchorImport}\n${importLine}`);
}

if (!source.includes('registerInstitutionRoutes(app, institutionSupabase)')) {
  if (!source.includes(middlewareAnchor)) throw new Error('Could not locate Express middleware anchor in server.ts');
  source = source.replace(middlewareAnchor, `${middlewareAnchor}${mountBlock}`);
}

fs.writeFileSync(path, source);
console.log('Institution routes are mounted in server.ts');
