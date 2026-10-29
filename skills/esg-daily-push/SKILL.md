---
name: esg-daily-push
description: 把 Xiao〇 ESG 社区已上线的「资讯动态」与「研究洞察」以「标签+标题+日期+200字摘要+链接」推送到企业微信群。数据直接取自线上发布地址，不需要本地项目、不需要任何绝对路径；自带已推送状态去重。当用户要求"推送 ESG 资讯""把社区最新动态发到企微群""群里发今日资讯"时使用。
agent_created: true
---

# ESG 资讯推送（纯线上数据源，跨平台零路径依赖）

## 一、设计原则

- **不依赖本地项目**：数据从线上发布的 JSON 直接读取，任何装了这个技能的机器都能跑（macOS / Windows 通用）。
- **不写任何绝对路径**：只用两个「按环境自动确定」的位置——用户主目录下的状态文件、企业微信 CLI。
- **增量推送**：状态文件记录已推送条目 id，只发新增/更新过的，不重复刷群。

## 二、位置与变量（三处，全部自动确定，不写死）

| 变量 | 值 | 确定方式 |
|---|---|---|
| `SRC` | 线上数据地址 | `https://707292385-byte.github.io/aiesg-workbench-downloads/academy/assets/community-public.json` |
| `STATE` | 已推送状态文件 | macOS：`~/.workbuddy/esg-push-state.json`；Windows：`%USERPROFILE%\.workbuddy\esg-push-state.json`（用 `os.path.expanduser('~/.workbuddy/esg-push-state.json')`，两个平台通用） |
| `GROUP` | 目标群名 | `ESG中心`（精确匹配） |

取数要点：
- 必须带破缓存参数：`?cb=<随机数>`（Pages 有 `max-age=600` 缓存，不带会读到旧副本）。
- 取数失败（超时/非 200/JSON 解析失败）→ 直接报告失败，**不要用旧缓存冒充今天的更新**。

## 三、推送内容规则

从 `observations`（资讯动态）和 `insights`（研究洞察）两个数组取，按 `date` 倒序，每个栏目最多 8 条，只取状态文件中未推送过的 `id`。

单条格式：
```
1. 【分类】标题（日期）
   摘要（≤200字，超出截断加…）
   链接：URL
```
- 资讯动态：`category` + `title` + `date` + `summary` + `content[]` 里 `type=source` 块的 `url`（无 source 块则跳过该条，宁缺不凑）。
- 研究洞察：`category` + `title` + `｜org` + `date` + `summary` + `url`。

整体格式：
```
📰 ESG 资讯动态（当日日期）
（条目…）

💡 研究洞察
（条目…）
```
两个栏目都无新增 → 发一句「今日社区无新增内容」。某栏目无新增则该栏目整段不出现。

## 四、发送

先取目标会话，再发 markdown：
```bash
wecom-cli message aibot sessions list        # 在返回里按 chat_name 精确匹配「ESG中心」，复制其 chat_id
wecom-cli message aibot send --json '{"chat_id":"<上一步复制的值>","msg_type":"markdown","markdown":{"content":"<正文>"}}'
```
- `chat_id` 必须来自**本次** `sessions list` 返回，不能用历史值或自行构造。
- 群不在列表里 → 报告「机器人最近会话中无该群」，不要发给其他人顶替。
- 凭证过期（errcode 853004）→ 执行 `wecom-cli auth init --noninteractive`，把返回的二维码链接发给用户扫码，扫完继续发送。
- Windows 提示：`wecom-cli` 若不在 PATH，用 `where wecom-cli` 定位后全路径调用。

## 五、状态文件

发送成功后写回：
```json
{"pushed_ids": ["id1", "id2"], "last_push": "YYYY-MM-DDTHH:MM:SS+08:00"}
```
- 合并而非覆盖，最多保留最近 500 个 id。
- 状态文件不存在 → 视首次运行，推最近 3 天的条目。

## 六、执行检查清单

1. 取线上 JSON（带 `?cb=`）→ 解析成功；
2. 读状态 → 算出新增条目 → 数量合理（不是全量几百条）；
3. 组装正文（每条 4 行结构、摘要 ≤200 字、每条都有链接）；
4. `sessions list` 匹配「ESG中心」→ 发送；
5. 成功后更新状态文件；
6. 汇报：发了几个栏目、各几条、群名。

## 七、常见问题

- **群里没收到**：先确认群在 `sessions list` 里；再看是否被企微限流（短时间内多条 markdown 可能合并）。
- **推了重复内容**：状态文件丢了或换了机器 —— 把状态文件拷过去，或首次运行接受一次"最近 3 天"的重复。
- **数据看起来是旧的**：Pages 缓存，重试带新的 `?cb=` 值；一般 45–90 秒内刷新。
- **`curl` 在 Windows PowerShell 里报错**：`curl` 是 `Invoke-WebRequest` 别名，请用 `curl.exe` 或直接用 Python 的 `urllib.request` 取数。
