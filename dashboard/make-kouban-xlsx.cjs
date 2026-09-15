/*
 * dashboard/make-kouban-xlsx.cjs
 * 当日の香盤表を Excel（.xlsx）に書き出す。
 *
 *   実行： node dashboard/make-kouban-xlsx.cjs "出力先.xlsx"
 *
 * 中身の出どころは ⑦PABタブ（dashboard/src/tabs/pab-plan.html）の
 * 「当日の流れ」と PEOPLE 配列。タブの8フェーズより細かく刻み、
 * 登壇者・講師・ご来賓の列も足してある。
 * タブ側を直したら、こちらの ROWS も直すこと。
 *
 * 外部ライブラリは使わない（zip は下の書き出しで組み立てている）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = process.argv[2] || 'docs/program/pab-production/20260926_PAB当日_香盤表.xlsx';

/* ══════════════════════════════════════
   1. 香盤の中身
   ══════════════════════════════════════ */

// 列の定義（順番がそのまま Excel の列になる）
const PEOPLE = ['野村', '鈴木', '横堀', '遠藤', '倉沢', '川名', '赤羽', '佐々木', '大野'];
const GUESTS = ['登壇（座談会①）', '田中さん', '阿部さん', 'ご来賓'];
const HEAD = ['時刻', '尺', 'プログラム', ...PEOPLE, ...GUESTS, '備考'];
const WIDTHS = [13, 6, 34, 24, 32, 26, 28, 22, 22, 24, 24, 26, 22, 22, 22, 18, 34];

const HEAD2 = [
  '', '', '',
  '野村 善文', '鈴木 萌加', '横堀 応彦', '遠藤 真有美', '倉沢', '川名 幸宏', '赤羽 ひろみ', '佐々木', '大野',
  '井川・小嶋・松本・高橋', '演出：座談会②・演出WS', '劇作：座談会③・劇作WS', '文化庁（お名前は確認中）', '',
];

function row(time, dur, prog, p, guests, note) {
  return [time, dur, prog, ...PEOPLE.map((n) => p[n] || ''), ...GUESTS.map((n) => guests[n] || ''), note || ''];
}

const ROWS = [
  row('9:00–9:20', '20分', '搬入開始・集合／レイアウトの確認・微調整', {
    野村: '原稿の最終チェック',
    鈴木: '仕込み全体の統括・レイアウト確認のリード',
    横堀: '進行表の最終確認・カンペ準備',
    遠藤: '受付設営',
    倉沢: '劇作WS資材の確認',
    川名: '演出WS資材の確認',
    赤羽: 'レイアウトの確認（図面どおりか）・島サインの確認',
    佐々木: 'レイアウトの確認・島番号サインの設置',
    大野: 'モニター2台の設置・PC接続',
  }, {}, '9:00開室のため開錠を待つ場合あり。テーブルと椅子は施設側が図面どおりに組んでくれている前提'),

  row('9:20–9:45', '25分', '受付設営・投影テスト', {
    野村: '場内',
    鈴木: '受付の設営を確認',
    横堀: 'カンペ準備 → 講師コールの支度',
    遠藤: '受付設営・お弁当の搬入受け取り（業者と数を照合）',
    倉沢: '島まわりの確認',
    川名: '島まわりの確認',
    赤羽: '島サインの確認',
    佐々木: '受付設営',
    大野: '投影テスト（モニター2台）',
  }, {}, 'お弁当の搬入時刻 ※要確認（受け取りは遠藤さん）'),

  row('9:45–9:50', '5分', '講師コールタイム（〜10:05）', {
    鈴木: '仕込みの続き',
    横堀: '講師コールタイム・控室へご案内・スライド受領',
    大野: 'スライドを受け取り次第 取り込み',
  }, {
    '登壇（座談会①）': 'ご到着 → 控室',
    田中さん: 'ご到着 → 控室',
    阿部さん: 'ご到着 → 控室',
  }, '講師6名の個別の到着時刻 ※要確認。スライドはこの時点で大野さんへ'),

  row('9:50–10:05', '15分', '音の被りリハ（9:50–10:00）／10:00 カメラマン到着', {
    野村: '10:00 外注カメラマンの受け入れ・撮影の段取り共有',
    鈴木: '音の被りリハ（3WSの位置で地声が届くか）',
    横堀: '控室で講師対応',
    遠藤: '受付の最終確認',
    佐々木: '音の被りリハ',
    大野: '音の被りリハ',
  }, {
    '登壇（座談会①）': '控室',
    田中さん: '控室',
    阿部さん: '控室',
  }, 'カメラマンはスチールのみ。撮影NGの方は色分けストラップで識別する運用を共有する'),

  row('10:05–10:20', '15分', 'スタッフ全体ブリーフィング（鈴木さんが主宰）', {
    野村: 'ブリーフィング',
    鈴木: 'ブリーフィング主宰 ── 進行・持ち場・転換手順・撮影NG運用・ハラスメントの案内と相談担当・緊急時導線',
    横堀: '控室で講師対応（ブリーフィングの要点はあとで共有）',
    遠藤: 'ブリーフィング',
    倉沢: 'ブリーフィング',
    川名: 'ブリーフィング',
    赤羽: 'ブリーフィング',
    佐々木: 'ブリーフィング',
    大野: 'ブリーフィング',
  }, {}, '相談担当：劇作＝鈴木さん／演出＝佐々木さん／プロデューサー＝遠藤さん。WSで拡声しない方針もここで全員に明言する'),

  row('10:20–10:30', '10分', '最終確認・各自持ち場へ', {
    鈴木: '場内統括',
    横堀: '控室で講師対応',
    遠藤: '受付につく',
    佐々木: '受付につく',
    大野: '投影の最終確認',
  }, {}, ''),

  row('10:30–11:00', '30分', '開場・受付開始', {
    野村: '場内で開演準備',
    鈴木: '場内統括・受付フロアを見る → 10:30から司会スタンバイ',
    横堀: '控室で講師対応',
    遠藤: '受付責任者（名簿照合・名札発行・島番号のご案内・撮影NGの確認・イレギュラーの現場判断）',
    倉沢: '場内',
    川名: '場内',
    赤羽: '場内',
    佐々木: '受付サポート（名簿照合・名札発行・島へのご案内）',
    大野: '投影の最終確認 → 受付サポート',
  }, {
    '登壇（座談会①）': '控室',
    田中さん: '控室',
    阿部さん: '控室',
    ご来賓: 'ご到着 ※時刻と お迎えの担当を決める',
  }, '受付の時点で職能別の島までご案内する。「今日は一日このチームで過ごします」と一言添える'),

  row('11:00–11:15', '15分', '開会 ── 開会挨拶 → ご来賓ご挨拶 → SEED事業のご説明', {
    野村: '開会挨拶・SEED事業のご説明',
    鈴木: '司会（開会・ご来賓ご紹介）',
    横堀: 'キュー出し・袖で講師アテンド',
    遠藤: '受付に常駐',
    佐々木: '場内',
    大野: 'PC操作・スライド出し',
  }, {
    '登壇（座談会①）': '控室で待機',
    ご来賓: 'ご挨拶（3分）',
  }, 'ご来賓のお名前とご肩書 ※確認中。司会の紹介文に入る'),

  row('11:15–11:20', '5分', 'アイスブレイク（島ごとに自己紹介）', {
    鈴木: 'アイスブレイク進行',
    横堀: '袖で登壇者スタンバイ',
    大野: '座談会①のスライドを準備',
  }, {
    '登壇（座談会①）': '登壇席へ',
  }, 'WSの45分を自己紹介で潰さないための5分。座談会の頭に置いてある'),

  row('11:20–12:00', '40分', '座談会① プロデューサー（登壇4名）', {
    野村: '場内',
    鈴木: '司会（繋ぎ）・押し戻し判断',
    横堀: 'キュー出し・袖で次登壇者スタンバイ',
    遠藤: '受付に常駐（途中入場の受け入れ）',
    倉沢: '場内',
    川名: '場内',
    赤羽: 'モデレーター',
    佐々木: '登壇席の転換準備',
    大野: 'PC操作・スライド出し',
  }, {
    '登壇（座談会①）': '登壇（冒頭に自己紹介を5分ずつ）',
    田中さん: '控室で待機',
    阿部さん: '控室で待機',
  }, 'マイクは無線4本＋有線1本の計5本。登壇席5席は仕込みの段階で組んでおく'),

  row('12:00–12:05', '5分', '転換（登壇席を5席から2席へ・マイク差し替え）', {
    鈴木: '転換',
    横堀: '袖で田中さんをアテンド',
    佐々木: '転換（椅子・マイク）',
    大野: '次の投影の準備',
  }, {
    田中さん: '袖でスタンバイ',
  }, ''),

  row('12:05–12:30', '25分', '座談会② 演出家（対談形式）', {
    鈴木: '司会（繋ぎ）',
    横堀: 'キュー出し',
    川名: 'モデレーター（聞き手）',
    佐々木: '転換準備',
    大野: 'スライド出し（画像中心）',
  }, {
    田中さん: '登壇',
    阿部さん: '袖でスタンバイ',
  }, '川名さんが聞き手、田中さんが話す形。スライドは文字を読ませず写真で進める'),

  row('12:30–12:35', '5分', '転換（登壇席を1席へ・マイク差し替え）', {
    鈴木: '転換',
    横堀: '袖で阿部さんをアテンド',
    佐々木: '転換（椅子・マイク）',
    大野: '次の投影の準備',
  }, {}, ''),

  row('12:35–13:00', '25分', '座談会③ 劇作家', {
    鈴木: '司会（繋ぎ）',
    横堀: 'キュー出し',
    倉沢: '場付き（阿部さんのサポート）',
    大野: 'スライド出し',
  }, {
    阿部さん: '登壇',
  }, '座談会③の聞き手を誰が務めるか ※要確認（記録上は倉沢さんが「場付き」）'),

  row('13:00–13:05', '5分', '会場転換・弁当配置・着席案内（全員で入る）', {
    野村: '講師と登壇者のフォロー',
    鈴木: '転換リード・着席案内アナウンス・弁当配置',
    横堀: '講師を担当島へ誘導',
    遠藤: 'お弁当の配布・数の確認・過不足の判断',
    倉沢: '劇作島へ',
    川名: '演出島へ',
    赤羽: 'プロデューサー島へ',
    佐々木: '転換・お弁当の配布',
    大野: '次の投影の準備',
  }, {
    '登壇（座談会①）': '担当島へ',
    田中さん: '演出島へ',
    阿部さん: '劇作島へ',
  }, '5分しかない。弁当は事前に配置場所を決めておく'),

  row('13:05–13:45', '40分', 'ランチ交流（お弁当・まい泉「楓雅」）', {
    野村: '説明会の準備',
    鈴木: '13:40 WS資材の配布',
    横堀: '講師が2島程度を回れるよう誘導',
    遠藤: '過不足の対応・ゴミの回収',
    倉沢: '劇作島でランチ',
    川名: '演出島でランチ',
    赤羽: 'プロデューサー島でランチ',
    佐々木: '場内',
    大野: '投影の切り替え準備',
  }, {
    '登壇（座談会①）': '島でランチ・学生と話す',
    田中さん: '島でランチ',
    阿部さん: '島でランチ',
  }, '講師がランチ中に2島程度を回って自己紹介を済ませる。WSの頭を軽くするため'),

  row('13:45–13:50', '5分', 'ワークショップ冒頭 ── ハラスメントについての案内（全体へ）', {
    鈴木: '全体へ案内（①しんどくなったら離席してよい ②講師も含めて全員で気をつける ③困ったらスタッフへ）',
    遠藤: '場内',
    佐々木: '場内',
  }, {}, '3本に分かれる前、全体に向けて。離席された方は講師控室へご案内する'),

  row('13:50–14:25', '35分', 'ワークショップ 3本 同室並行', {
    野村: '場内',
    鈴木: '3WS巡回・音の被り監視・劇作WSの相談担当',
    横堀: '控室・場内',
    遠藤: 'プロデューサーWSの相談担当・場内サポート・ゴミの回収',
    倉沢: '劇作WS 進行（20名）',
    川名: '演出WS 進行（15名）',
    赤羽: 'プロデューサーWS 進行（20名）',
    佐々木: '演出WS 補助・相談担当',
    大野: 'プロデューサーWS 補助',
  }, {
    田中さん: '演出WS（題材はロミオとジュリエット）',
    阿部さん: '劇作WS',
  }, 'マイクは一切使わない（1本でも拡声すると音量競争になる）。演出WSは机を使わず椅子だけ ── 机をいつ寄せるか ※要確認'),

  row('14:25–14:30', '5分', '「残り5分」の合図 → 発表の準備', {
    鈴木: '合図・発表資材の確認',
    倉沢: '劇作チーム発表の段取り',
    川名: '演出チーム発表の段取り',
    赤羽: '発表の段取り',
    佐々木: '進行のサポート',
    大野: '発表スライドの受け取り',
  }, {}, ''),

  row('14:30–14:33', '3分', '全体共有 ── 導入', {
    鈴木: '司会・時間管理',
    横堀: '講師をフィードバック席へ',
    大野: '投影',
  }, {}, '全体共有を20分に縮めてWSを60分にする案が出ている ※9/18の全体確認で確定。決まると下の4行の尺が変わる'),

  row('14:33–14:43', '10分', '劇作チームの発表', { 鈴木: '時間管理', 倉沢: '発表のフォロー', 大野: '投影' }, { 阿部さん: '発表を聞く' }, ''),
  row('14:43–14:53', '10分', '演出チームの発表', { 鈴木: '時間管理', 川名: '発表のフォロー', 大野: '投影' }, { 田中さん: '発表を聞く' }, ''),
  row('14:53–15:03', '10分', 'プロデューサーチームの発表', { 鈴木: '時間管理', 赤羽: '発表のフォロー', 大野: '投影' }, { '登壇（座談会①）': '発表を聞く' }, ''),

  row('15:03–15:10', '7分', '講師フィードバック', {
    野村: '場内（発表を聞く）',
    鈴木: '時間管理・発表資材の回収',
    横堀: '講師のフォロー',
  }, {
    田中さん: 'フィードバック',
    阿部さん: 'フィードバック',
  }, '職能をまたいでコメントいただく想定。ここがSEEDの「職能別に分けすぎない」という設計に直結する時間'),

  row('15:10–15:30', '20分', 'SEED育成プログラム説明会（約8枚・20分）', {
    野村: '登壇',
    鈴木: '司会・終了アナウンス・交流タイムのご案内',
    横堀: 'タイムキープ',
    遠藤: 'アンケートの準備',
    大野: '説明会スライドの投影',
  }, {}, '全体パートは髙田さん原案・野村さん最終調整、職能別は各担当'),

  row('15:30–15:45', '15分', '終了・見送り', {
    野村: '講師見送り',
    鈴木: '終了アナウンス',
    横堀: '講師見送り',
    遠藤: 'アンケート回収・見送り',
    佐々木: 'アンケート回収',
  }, {
    '登壇（座談会①）': 'ご退出（残れる方は交流タイムへ）',
    田中さん: 'ご退出',
    阿部さん: 'ご退出',
  }, ''),

  row('15:45–17:00', '75分', '交流タイム（残れる方だけ）', {
    鈴木: '切り上げの判断',
    遠藤: '場内',
    倉沢: '場内',
    川名: '場内',
    赤羽: '場内',
    佐々木: '場内',
    大野: '機材の返却・モニターの引き渡し',
  }, {}, '会場の使用延長（18:00まで）を申し出る前提。認められなければ15:45で切り上げて撤収へ'),

  row('17:00–17:45', '45分', '撤収・原状復帰（全員／鈴木さんが統括）', {
    野村: '撤収', 鈴木: '撤収統括', 横堀: '撤収', 遠藤: '撤収',
    倉沢: '撤収', 川名: '撤収', 赤羽: '撤収', 佐々木: '撤収', 大野: '撤収',
  }, {}, ''),

  row('17:45–18:00', '15分', '最終確認・会場引き渡し', { 鈴木: '会場引き渡し' }, {}, '会場は20:00まで利用可'),
];

/* 2枚目：担当と役割 */
const ROLES = [
  ['氏名', '当日の役割'],
  ['野村 善文', '開会挨拶・SEED事業のご説明／SEED説明会 登壇／外注カメラマンの手配・当日窓口'],
  ['鈴木 萌加', '全体司会（開会・ご来賓ご紹介・各パート繋ぎ・全体共有・説明会）／全体制作統括（進行判断・PAB主催折衝・ブリーフィング主宰・13:00転換のリード・撤収統括）'],
  ['横堀 応彦', '講師アテンド（控室・誘導・スライド受領）／進行・タイムキープ（座談会のキュー出し・転換号令）'],
  ['遠藤 真有美', '受付責任者（イレギュラーの現場判断・島へのご案内）／お弁当まわりの責任者（受け取り・数の照合・配布）／アンケート回収'],
  ['倉沢', '劇作WS 進行（阿部さんと共同）／座談会③の場付き'],
  ['川名 幸宏', '座談会② モデレーター／演出WS 進行'],
  ['赤羽 ひろみ', '会場レイアウトの設計・図面／座談会① モデレーター／プロデューサーWS 進行'],
  ['佐々木', '受付サポート／進行サポート／演出WS補助（相談担当）'],
  ['大野', '映像・接続の責任者（大型モニター2台の手配窓口・登壇資料の集約・スライド出し）／会場PA・映像オペとの連携窓口'],
  ['', ''],
  ['井川 荃芬・小嶋 麻倫子・松本 美千穂・高橋 戦車', '座談会①（プロデューサー）登壇。高橋さんは劇団鹿殺し'],
  ['田中さん', '座談会②（演出家）登壇／演出WS 講師'],
  ['阿部さん', '座談会③（劇作家）登壇／劇作WS 講師'],
  ['ご来賓（文化庁）', '開会直後にご挨拶（3分）。お名前とご肩書は確認中'],
  ['', ''],
  ['髙田 郁実', '当日は会場に入らない（遠隔）。連絡手段と対応可能時間を9/25までに確定する'],
];

/* 3枚目：注記と未確定 */
const NOTES = [
  ['区分', '内容'],
  ['音', 'ワークショップではマイクを一切使わない。1本でも拡声すると他2本が対抗して音量競争になる'],
  ['音', 'マイクは無線4本＋有線1本の計5本（9/15確保）。有線の1本をどの席に置くかは仕込みで決める'],
  ['投影', 'スクリーンは立てない。ステージ左右の大型モニター2台で投影する'],
  ['撮影', '外注カメラマンはスチールのみ。撮影NGの方は色分けストラップで識別し、受付でご希望を確認する'],
  ['ハラスメント', '相談担当は 劇作＝鈴木さん／演出＝佐々木さん／プロデューサー＝遠藤さん。離席された方は講師控室へご案内する（講師が在室していることがあるので一声かけてから）'],
  ['連絡先', 'PAB制作担当 佐々木一美さん 090-9535-2305 ／ JPASNコンテンツ担当 田村美紀さん 090-7333-4309（7Fラウンジ）'],
  ['', ''],
  ['※要確認', '全体共有の内訳 ── 20分に縮めてWSを60分にするか。9/18の全体確認で確定する'],
  ['※要確認', 'ご来賓（文化庁）のお名前とご肩書。お迎えとご案内の担当も決めていない'],
  ['※要確認', 'お弁当の搬入時刻（受け取りは遠藤さん）'],
  ['※要確認', '講師6名それぞれの到着時刻。9:45の講師コールタイムに合わせられるか'],
  ['※要確認', '座談会③（劇作家）の聞き手を誰が務めるか'],
  ['※要確認', '演出家WSは机を使わない。机をいつ寄せるか（13:00–13:05の転換はランチ配膳で埋まっている）'],
  ['', ''],
  ['出どころ', 'ダッシュボード ⑦ PAB企画・制作進行 タブの「当日の流れ」と香盤。2026年9月15日時点'],
];

/* ══════════════════════════════════════
   2. xlsx を書き出す（zip を手で組み立てる）
   ══════════════════════════════════════ */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function zip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, 'utf8');
    const body = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8
    local.writeUInt16LE(8, 8);      // deflate
    local.writeUInt16LE(0, 10);     // time
    local.writeUInt16LE(0x5a2f, 12); // date（2025-01-15 固定・中身に関係しない）
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, body);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0x5a2f, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(body.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt32LE(0, 38); // 外部属性
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nameBuf);
    offset += local.length + nameBuf.length + body.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, centralBuf, end]);
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/\x00-\x08/g, '');

function colName(i) {
  let s = '';
  i += 1;
  while (i > 0) { const r = (i - 1) % 26; s = String.fromCharCode(65 + r) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

// s: 1=見出し 2=時刻 3=本文 4=プログラム 5=小見出し
function sheetXml(rows, widths, freeze) {
  const cols = widths.map((w, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const body = rows.map((r, ri) => {
    const cells = r.cells.map((c, ci) => {
      if (c.v === '' || c.v == null) return `<c r="${colName(ci)}${ri + 1}" s="${c.s}"/>`;
      return `<c r="${colName(ci)}${ri + 1}" s="${c.s}" t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
    }).join('');
    const h = r.h ? ` ht="${r.h}" customHeight="1"` : '';
    return `<row r="${ri + 1}"${h}>${cells}</row>`;
  }).join('');
  const pane = freeze
    ? `<pane xSplit="${freeze.x}" ySplit="${freeze.y}" topLeftCell="${colName(freeze.x)}${freeze.y + 1}" activePane="bottomRight" state="frozen"/>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0" workbookViewId="0">${pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${body}</sheetData><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup orientation="landscape" paperSize="8" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="10"/><name val="游ゴシック"/><family val="2"/></font>
<font><b/><sz val="10"/><name val="游ゴシック"/><family val="2"/></font>
<font><b/><sz val="11"/><name val="游ゴシック"/><family val="2"/></font>
<font><sz val="9"/><color rgb="FF6B7078"/><name val="游ゴシック"/><family val="2"/></font>
</fonts>
<fills count="5">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEDEEF0"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF7F7F8"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD8DADD"/></left><right style="thin"><color rgb="FFD8DADD"/></right><top style="thin"><color rgb="FFD8DADD"/></top><bottom style="thin"><color rgb="FFD8DADD"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
</styleSheet>`;

function build() {
  // ── 1枚目：香盤 ──
  const s1rows = [];
  s1rows.push({ cells: HEAD.map((v) => ({ v, s: 1 })), h: 24 });
  s1rows.push({ cells: HEAD2.map((v) => ({ v, s: 5 })), h: 18 });
  for (const r of ROWS) {
    const cells = r.map((v, i) => {
      if (i === 0 || i === 1) return { v, s: 2 };
      if (i === 2) return { v, s: 4 };
      if (i === HEAD.length - 1) return { v, s: 5 };
      return { v, s: 3 };
    });
    s1rows.push({ cells });
  }

  const s2rows = ROLES.map((r, i) => ({
    cells: r.map((v) => ({ v, s: i === 0 ? 1 : 3 })),
    h: i === 0 ? 22 : undefined,
  }));
  const s3rows = NOTES.map((r, i) => ({
    cells: r.map((v) => ({ v, s: i === 0 ? 1 : 3 })),
    h: i === 0 ? 22 : undefined,
  }));

  const sheets = [
    { name: '香盤（時系列）', xml: sheetXml(s1rows, WIDTHS, { x: 3, y: 2 }) },
    { name: '担当と役割', xml: sheetXml(s2rows, [26, 90], { x: 1, y: 1 }) },
    { name: '注記・未確定', xml: sheetXml(s3rows, [14, 96], { x: 0, y: 1 }) },
  ];

  const files = [
    {
      name: '[Content_Types].xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`, 'utf8'),
    },
    {
      name: '_rels/.rels',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`, 'utf8'),
    },
    {
      name: 'xl/workbook.xml',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`, 'utf8'),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`, 'utf8'),
    },
    { name: 'xl/styles.xml', data: Buffer.from(STYLES, 'utf8') },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: Buffer.from(s.xml, 'utf8') })),
  ];

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, zip(files));
  console.log(`✓ ${OUT}（${ROWS.length}コマ × ${HEAD.length}列 / シート3枚 / ${(fs.statSync(OUT).size / 1024).toFixed(1)}KB）`);
}

build();
