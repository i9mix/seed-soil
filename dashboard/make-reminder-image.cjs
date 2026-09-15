// 参加者への確認メールに添付するサムネイル画像を作る。
//   スマホ1スクロールで収まる 4:5（1080×1350）。SEEDデザインシステム準拠（白＋グレーのみ）。
//   使い方: node make-reminder-image.cjs <出力パス>
const { createCanvas, registerFont, loadImage } = require('canvas');
const fs = require('fs');

registerFont('C:/Windows/Fonts/YuGothM.ttc', { family: 'YuM' });
registerFont('C:/Windows/Fonts/YuGothB.ttc', { family: 'YuB' });
registerFont('C:/Windows/Fonts/GOTHIC.TTF', { family: 'CG' });
registerFont('C:/Windows/Fonts/GOTHICB.TTF', { family: 'CGB' });

const W = 1080, H = 1350;
const INK = '#1A1C1E', INK2 = '#4A4F55', INK3 = '#8B9098', LINE = '#DCDEE1', GROUND = '#FFFFFF';
const M = 96;                       // 左右の余白

const c = createCanvas(W, H);
const g = c.getContext('2d');

g.fillStyle = GROUND; g.fillRect(0, 0, W, H);

// ── 罫線 ────────────────────────────────
function rule(y, x1 = M, x2 = W - M) {
  g.strokeStyle = LINE; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x1, y + 0.5); g.lineTo(x2, y + 0.5); g.stroke();
}
// ── 字間つきの描画 ──────────────────────
function tracked(text, x, y, sp) {
  let cx = x;
  for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
  return cx - x - sp;
}
function trackedWidth(text, sp) {
  let w = 0;
  for (const ch of text) w += g.measureText(ch).width + sp;
  return w - sp;
}

// ══ ヘッダ ═══════════════════════════════
g.fillStyle = INK3; g.font = '22px CG';
tracked('PERFORMING ARTS BASE 2026', M, 96, 3.4);

g.fillStyle = INK; g.font = '30px CGB';
tracked('SEED', M, 150, 5);

// ══ タイトル ═════════════════════════════
g.fillStyle = INK; g.font = '52px YuB';
g.fillText('SEED PAB特別プログラム', M, 258);
g.fillText('＆講座説明会', M, 326);

g.fillStyle = INK2; g.font = '25px YuM';
g.fillText('舞台をつくる三つの仕事に、一日で出会う。', M, 384);

rule(424);

// ══ 日時・会場 ═══════════════════════════
g.fillStyle = INK; g.font = '76px CGB';
const dW = tracked('2026.09.26', M, 512, 1);
g.fillStyle = INK3; g.font = '30px CG';
tracked('SAT', M + dW + 22, 512, 2);

g.fillStyle = INK; g.font = '46px CG';
const tW = tracked('11:00 – 15:30', M, 578, 1);
g.fillStyle = INK3; g.font = '24px YuM';
g.fillText('開場 10:30', M + tW + 24, 578);

g.fillStyle = INK2; g.font = '27px YuM';
g.fillText('東京国際フォーラム ガラス棟7F 701会議室', M, 634);

rule(682);

// ══ タイムテーブル ═══════════════════════
const ROWS = [
  ['10:30', '開場・受付', ''],
  ['11:00', '開会・ごあいさつ', ''],
  ['11:20', '座談会', 'プロデューサー／演出家／劇作家'],
  ['13:00', 'ランチ交流', 'お弁当つき'],
  ['13:45', 'ワークショップ', '申込時に選んだ1講座'],
  ['14:30', '全体共有', ''],
  ['15:10', 'SEED育成プログラム説明会', ''],
  ['15:30', '終了', '']
];
let y = 744;
const TX = M + 168;                 // 内容の開始位置
ROWS.forEach(function (r, i) {
  g.fillStyle = (r[1] === '終了') ? INK3 : INK;
  g.font = '28px CG';
  g.fillText(r[0], M, y);
  g.fillStyle = (r[1] === '終了') ? INK3 : INK;
  g.font = (r[2] || r[1] === '座談会' || r[1] === 'ワークショップ') ? '28px YuB' : '28px YuM';
  g.fillText(r[1], TX, y);
  if (r[2]) {
    const w = g.measureText(r[1]).width;
    g.fillStyle = INK3; g.font = '21px YuM';
    g.fillText(r[2], TX + w + 16, y);
  }
  if (i < ROWS.length - 1) rule(y + 18);
  y += 54;
});

// ══ フッタ ═══════════════════════════════
rule(H - 182);

g.fillStyle = INK; g.font = '30px YuB';
const freeW = g.measureText('参加無料・お弁当つき').width;   // フォントを切り替える前に測る
g.fillText('参加無料・お弁当つき', M, H - 124);
g.fillStyle = INK3; g.font = '24px YuM';
g.fillText('申込締切 9月24日（木）', M + freeW + 28, H - 124);

g.fillStyle = INK2; g.font = '25px CG';
tracked('seed-open-course.vercel.app', M, H - 70, 0.6);

// 右下に主催
g.fillStyle = INK3; g.font = '21px YuM';
const host = '主催：文化庁／日本芸術文化振興会／JPASN';
g.fillText(host, W - M - g.measureText(host).width, H - 70);

const out = process.argv[2] || 'reminder.png';
fs.writeFileSync(out, c.toBuffer('image/png'));
console.log('書き出し: ' + out + '  ' + W + 'x' + H);
