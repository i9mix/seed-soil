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
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    text = response.content[0].text
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        return json.loads(match.group())
    return {"date": "", "reports": []}

def generate_html(data):
    """template.html を読み込んで解析結果を埋め込んだ HTML を生成"""
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

    with open("template.html", "r", encoding="utf-8") as f:
        html = f.read()

    html = html.replace("%%DATE%%", date_str)
    html = html.replace("%%MEMBER_COUNT%%", str(len(reports)))
    html = html.replace("%%TOTAL_URGENT%%", str(total_urgent))
    html = html.replace("%%TOTAL_WIP%%", str(total_wip))
    html = html.replace("%%TOTAL_PLAN%%", str(total_plan))
    html = html.replace("%%NOW%%", now)
    html = html.replace("%%CARDS%%", cards_html)

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
