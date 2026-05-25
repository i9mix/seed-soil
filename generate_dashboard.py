import os
import json
import re
from datetime import datetime, timezone, timedelta
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
import anthropic

SLACK_BOT_TOKEN = os.environ["SLACK_BOT_TOKEN"]
ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]
CHANNEL_ID = os.environ.get("SLACK_CHANNEL_ID", "C0974GKQQTD")

JST = timezone(timedelta(hours=9))

def get_recent_thread_ts(client):
    """チャンネルから直近の朝礼スレッドのtsを取得"""
    result = client.conversations_history(channel=CHANNEL_ID, limit=30)
    for msg in result["messages"]:
        text = msg.get("text", "")
        # 日付パターン（朝礼スレッドの親メッセージ）
        if re.search(r"20\d{2}[\/\-]\d{1,2}[\/\-]\d{1,2}", text) and msg.get("reply_count", 0) > 0:
            return msg["ts"]
    return None

def get_thread_messages(client, thread_ts):
    """スレッドのメッセージを全件取得"""
    result = client.conversations_replies(channel=CHANNEL_ID, ts=thread_ts)
    messages = []
    for msg in result["messages"][1:]:  # 親メッセージを除く
        user_id = msg.get("user", "")
        text = msg.get("text", "")
        if "Daily Report" in text or "緊急" in text or "進行中" in text:
            # ユーザー名を取得
            try:
                user_info = client.users_info(user=user_id)
                name = user_info["user"]["profile"].get("real_name", user_id)
            except Exception:
                name = user_id
            messages.append({"name": name, "text": text})
    return messages

def parse_reports_with_claude(messages):
    """Claude APIでメッセージを解析してタスクを抽出"""
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    messages_text = "\n\n---\n\n".join(
        [f"投稿者: {m['name']}\n{m['text']}" for m in messages]
    )

    prompt = f"""以下のSlackデイリーレポートを解析して、メンバーごとのタスクをJSON形式で返してください。

{messages_text}

以下のJSON形式で返してください（前置きや説明文は不要、JSONのみ）:
{{
  "date": "取得した日付（例: 2026/05/21）",
  "reports": [
    {{
      "name": "投稿者名",
      "urgent": ["緊急タスク1", "緊急タスク2"],
      "wip": ["進行中タスク1", "進行中タスク2"],
      "plan": ["予定タスク1", "予定タスク2"]
    }}
  ]
}}

タスク文字列にSOILまたはSEEDが含まれる場合はそのまま含めてください。"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group())
    return {"date": "", "reports": []}

def generate_html(data):
    """解析結果からHTMLを生成"""
    reports = data.get("reports", [])
    date_str = data.get("date", "")
    now = datetime.now(JST).strftime("%Y/%m/%d %H:%M JST")

    total_urgent = sum(len(r.get("urgent", [])) for r in reports)
    total_wip = sum(len(r.get("wip", [])) for r in reports)
    total_plan = sum(len(r.get("plan", [])) for r in reports)

    avatar_colors = [
        ("#E6F1FB", "#0C447C"), ("#E1F5EE", "#085041"), ("#FAEEDA", "#633806"),
        ("#FBEAF0", "#72243E"), ("#EEEDFE", "#3C3489"), ("#FAECE7", "#712B13"),
        ("#EAF3DE", "#27500A"), ("#F1EFE8", "#444441"),
    ]

    def task_class(text):
        if "SOIL" in text: return "soil"
        if "SEED" in text: return "seed"
        return ""

    def tag_html(text):
        tags = ""
        if "SOIL" in text: tags += '<span class="tag tag-soil">SOIL</span>'
        if "SEED" in text: tags += '<span class="tag tag-seed">SEED</span>'
        return tags

    def initials(name):
        parts = name.strip().split()
        if len(parts) >= 2:
            return parts[0][0] + parts[1][0] if parts[1] else parts[0][:2]
        return name[:2]

    cards_html = ""
    for i, r in enumerate(reports):
        bg, color = avatar_colors[i % len(avatar_colors)]
        name = r.get("name", "")
        urgent = r.get("urgent", [])
        wip = r.get("wip", [])
        plan = r.get("plan", [])

        urgent_html = ""
        if urgent:
            tasks = "".join(f'<div class="task {task_class(t)}">{t}{tag_html(t)}</div>' for t in urgent)
            urgent_html = f'<div class="group"><div class="group-label gl-urgent">⚠ 緊急（今日中）</div>{tasks}</div>'

        wip_html = ""
        if wip:
            tasks = "".join(f'<div class="task {task_class(t)}">{t}{tag_html(t)}</div>' for t in wip)
            wip_html = f'<div class="group"><div class="group-label gl-wip">⚡ 進行中</div>{tasks}</div>'

        plan_html = ""
        if plan:
            tasks = "".join(f'<div class="task {task_class(t)}">{t}{tag_html(t)}</div>' for t in plan)
            plan_html = f'<div class="group"><div class="group-label gl-plan">📅 今後予定</div>{tasks}</div>'

        cards_html += f"""
        <div class="card">
          <div class="card-header">
            <div class="avatar" style="background:{bg};color:{color}">{initials(name)}</div>
            <div><div class="member-name">{name}</div><div class="member-date">{date_str}</div></div>
          </div>
          {urgent_html}{wip_html}{plan_html}
        </div>"""

    html = f"""<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>デイリーレポートダッシュボード</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=DM+Mono:wght@500&display=swap" rel="stylesheet">
<style>
:root {{
  --bg:#F7F6F2;--surface:#fff;--border:#E5E3DC;
  --text:#1A1916;--muted:#6B6860;--hint:#A8A69F;
  --soil:#1D9E75;--soil-bg:#E1F5EE;--soil-text:#085041;
  --seed:#378ADD;--seed-bg:#E6F1FB;--seed-text:#0C447C;
}}
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Noto Sans JP',sans-serif;background:var(--bg);color:var(--text);padding:2rem;min-height:100vh}}
.page-header{{max-width:1100px;margin:0 auto 1.5rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap}}
h1{{font-size:22px;font-weight:700;letter-spacing:-0.02em;margin-bottom:6px}}
.meta{{display:flex;align-items:center;gap:8px;flex-wrap:wrap}}
.badge{{font-size:11px;font-weight:500;padding:3px 10px;border-radius:20px;display:inline-block}}
.badge-slack{{background:#4A154B;color:#fff}}
.badge-date{{background:var(--border);color:var(--muted)}}
.updated{{font-size:12px;color:var(--hint);text-align:right}}
.metrics{{max-width:1100px;margin:0 auto 1.25rem;display:grid;grid-template-columns:repeat(4,1fr);gap:10px}}
.metric{{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1rem 1.25rem}}
.metric-label{{font-size:11px;color:var(--hint);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px}}
.metric-value{{font-size:28px;font-weight:700;font-family:'DM Mono',monospace;letter-spacing:-0.03em}}
.metric-value.red{{color:#C0392B}}.metric-value.amber{{color:#9A6500}}.metric-value.blue{{color:#1A4FA0}}
.legend{{max-width:1100px;margin:0 auto 1rem;display:flex;gap:14px;flex-wrap:wrap}}
.leg{{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--muted)}}
.leg-dot{{width:9px;height:9px;border-radius:50%}}
.grid{{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(2,1fr);gap:12px}}
.card{{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.25rem}}
.card-header{{display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)}}
.avatar{{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0}}
.member-name{{font-size:14px;font-weight:700}}.member-date{{font-size:11px;color:var(--hint);font-family:'DM Mono',monospace}}
.group{{margin-bottom:9px}}.group:last-child{{margin-bottom:0}}
.group-label{{display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;margin-bottom:6px}}
.gl-urgent{{background:#FEF0EE;color:#C0392B;border:1px solid #F5C4B3}}
.gl-wip{{background:#FEF9EE;color:#9A6500;border:1px solid #FAD894}}
.gl-plan{{background:#EEF4FE;color:#1A4FA0;border:1px solid #BDD3F8}}
.task{{font-size:12.5px;padding:4px 0 4px 11px;border-left:2.5px solid var(--border);margin-left:4px;margin-bottom:3px;line-height:1.5;display:flex;align-items:baseline;gap:5px;flex-wrap:wrap}}
.task.soil{{border-left-color:var(--soil)}}.task.seed{{border-left-color:var(--seed)}}
.tag{{font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;flex-shrink:0}}
.tag-soil{{background:var(--soil-bg);color:var(--soil-text)}}.tag-seed{{background:var(--seed-bg);color:var(--seed-text)}}
.footer{{max-width:1100px;margin:2rem auto 0;padding-top:1rem;border-top:1px solid var(--border);font-size:11px;color:var(--hint);display:flex;justify-content:space-between}}
@media(max-width:700px){{body{{padding:1rem}}.grid{{grid-template-columns:1fr}}.metrics{{grid-template-columns:repeat(2,1fr)}}}}
</style>
</head>
<body>
<div class="page-header">
  <div>
    <h1>デイリーレポートダッシュボード</h1>
    <div class="meta">
      <span class="badge badge-slack">#101-会議関連</span>
      <span class="badge badge-date">{date_str}</span>
      <span class="badge badge-date">{len(reports)}名</span>
    </div>
  </div>
  <div class="updated">最終更新<br>{now}</div>
</div>
<div class="metrics">
  <div class="metric"><div class="metric-label">投稿メンバー</div><div class="metric-value">{len(reports)}</div></div>
  <div class="metric"><div class="metric-label">緊急タスク</div><div class="metric-value red">{total_urgent}</div></div>
  <div class="metric"><div class="metric-label">進行中タスク</div><div class="metric-value amber">{total_wip}</div></div>
  <div class="metric"><div class="metric-label">今後予定</div><div class="metric-value blue">{total_plan}</div></div>
</div>
<div class="legend">
  <div class="leg"><div class="leg-dot" style="background:var(--soil)"></div>SOIL</div>
  <div class="leg"><div class="leg-dot" style="background:var(--seed)"></div>SEED</div>
  <div class="leg"><div class="leg-dot" style="background:var(--border)"></div>共通</div>
</div>
<div class="grid">{cards_html}</div>
<div class="footer">
  <span>Slackデイリーレポートより自動生成（毎朝9:00更新）</span>
  <span>i9mix/seed-soil</span>
</div>
</body>
</html>"""
    return html

def main():
    slack_client = WebClient(token=SLACK_BOT_TOKEN)

    print("Slackからメッセージを取得中...")
    thread_ts = get_recent_thread_ts(slack_client)
    if not thread_ts:
        print("朝礼スレッドが見つかりませんでした")
        return

    messages = get_thread_messages(slack_client, thread_ts)
    print(f"{len(messages)}件のレポートを取得")

    if not messages:
        print("デイリーレポートが見つかりませんでした")
        return

    print("Claude APIで解析中...")
    data = parse_reports_with_claude(messages)
    print(f"{len(data.get('reports', []))}名分のタスクを抽出")

    print("HTMLを生成中...")
    html = generate_html(data)

    with open("index.html", "w", encoding="utf-8") as f:
        f.write(html)
    print("index.html を更新しました")

if __name__ == "__main__":
    main()
