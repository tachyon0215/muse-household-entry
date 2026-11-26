// Entry point for the Kakeibo Ledger make.fun submission.
//
// Running this file assembles the deliverable in one place: it mirrors the
// static site (everything under app/) and the captured screenshots into the
// output directory, then asks the vendored make.fun frontend helper to
// summarise that directory into a dossier.json manifest. The grader reads
// the manifest to see what the entry contains, so the copy has to be a
// faithful, complete replica of the two source folders.
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

// Describe the assembled output and store the manifest next to the copied
// files. The limits below cap how much text, imagery, and app payload the
// dossier is allowed to account for.
const manifest = buildDossier(targetDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
});
writeFileSync(join(targetDir, 'dossier.json'), manifest);
