/**
 * Publica ./vitrine no branch gh-pages (GitHub Pages), sem mexer no branch atual.
 * Uso: npm run vitrine && npm run vitrine:publicar
 * No GitHub: Settings → Pages → Source: "Deploy from a branch" → gh-pages / (root).
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

if (!existsSync("vitrine/index.html")) throw new Error("Rode antes: npm run vitrine");
const sh = (cmd, cwd = ".") => execSync(cmd, { cwd, stdio: "inherit" });
const dir = mkdtempSync(path.join(tmpdir(), "arrumae-pages-"));
rmSync(dir, { recursive: true, force: true });

let hasRemote = false;
try {
  execSync("git ls-remote --exit-code --heads origin gh-pages", { stdio: "ignore" });
  hasRemote = true;
} catch {}

if (hasRemote) {
  sh("git fetch origin gh-pages");
  sh(`git worktree add "${dir}" origin/gh-pages`);
  sh("git checkout -B gh-pages", dir);
} else {
  sh(`git worktree add --detach "${dir}"`);
  sh("git checkout --orphan gh-pages", dir);
}
for (const f of readdirSync(dir)) if (f !== ".git") rmSync(path.join(dir, f), { recursive: true, force: true });
cpSync("vitrine", dir, { recursive: true });
sh("git add -A", dir);
try {
  sh('git commit -q -m "vitrine: atualiza capturas das telas"', dir);
  sh("git push -u origin gh-pages", dir);
} catch {
  console.log("Nada mudou na vitrine.");
}
sh(`git worktree remove --force "${dir}"`);
console.log("✅ Vitrine publicada no branch gh-pages.");
