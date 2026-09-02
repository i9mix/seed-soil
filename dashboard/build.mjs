/*
 * dashboard/build.mjs
 * src/ の断片から dashboard/template.html を組み立てる。
 *
 *   実行： node build.mjs   （dashboard/ ディレクトリで）
 *
 * 置き換えるマーカー：
 *   <!--@CSS-->            → src/styles.css
 *   <!--@TAB:name-->       → src/tabs/name.html
 *
 * template.html は生成物。手で編集しないこと。
 *   ・タブの中身          → src/tabs/*.html
 *   ・配色・レイアウト     → src/styles.css
 *   ・ヘッダ／ナビ／JS     → src/shell.html
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (...p) => readFileSync(join(here, ...p), 'utf8');
const withNewline = (s) => (s.endsWith('\n') ? s : s + '\n');

let out = read('src', 'shell.html');
const missing = [];
let tabCount = 0;

out = out.replace(/^[ \t]*<!--@CSS-->[ \t]*\r?\n/gm, () => {
  if (!existsSync(join(here, 'src', 'styles.css'))) { missing.push('styles.css'); return ''; }
  return withNewline(read('src', 'styles.css'));
});

out = out.replace(/^[ \t]*<!--@TAB:([A-Za-z0-9_-]+)-->[ \t]*\r?\n/gm, (_m, name) => {
  if (!existsSync(join(here, 'src', 'tabs', name + '.html'))) { missing.push('tabs/' + name + '.html'); return ''; }
  tabCount += 1;
  return withNewline(read('src', 'tabs', name + '.html'));
});

if (missing.length) {
  console.error('✗ 断片が見つかりません: ' + missing.join(', '));
  process.exit(1);
}
if (/<!--@(CSS|TAB:)/.test(out)) {
  console.error('✗ 未解決のマーカーが残っています');
  process.exit(1);
}

writeFileSync(join(here, 'template.html'), out);
console.log('✓ template.html を生成しました（タブ ' + tabCount + ' 枚 / ' + out.split('\n').length + ' 行）');
