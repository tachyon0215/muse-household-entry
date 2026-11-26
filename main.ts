// Kakeibo Ledger — the program that hands the entry in.
//
// One run does the whole handover: the static site under app/ and the
// screenshots beside it are copied across to the output directory, and the
// vendored make.fun frontend helper then reads that directory back and
// writes its summary as dossier.json. That manifest is how the grader
// inventories the entry, which is why the copy step has to reproduce both
// folders exactly — nothing dropped, nothing renamed.
//
// The destination is the MAKEFUN_OUTPUT_DIR environment variable when set,
// falling back to /output, which is where the grading environment expects
// the finished entry to appear.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// Absolute path of the folder this file lives in, derived from the module
// URL so the program works no matter where it is invoked from.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// Where the assembled entry should be written.
const targetDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy one directory tree from the repo into the output directory. When the
// source folder is absent there is nothing to mirror, so the step is
// skipped quietly instead of failing the whole run. Nested folders and
// their contents come along untouched, preserving the site's structure.
function mirrorIntoOutput(folderName: string): void {
  const source = join(repoRoot, folderName);
  if (!existsSync(source)) {
    return;
  }
  cpSync(source, join(targetDir, folderName), { recursive: true });
}

mkdirSync(targetDir, { recursive: true });

// The screenshots folder is created up front so the output layout is stable
// even before anything is copied into it.
mkdirSync(join(targetDir, 'screenshots'), { recursive: true });

mirrorIntoOutput('app');
mirrorIntoOutput('screenshots');

// Last step: summarise what was assembled and drop the manifest in beside
// the copied files. The limits passed here bound how much text, imagery,
// and app payload the dossier will account for.
const manifest = buildDossier(targetDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(targetDir, 'dossier.json'), manifest);
