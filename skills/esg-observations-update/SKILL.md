---
name: esg-observations-update
description: 更新 Xiao〇 ESG 社区「资讯与观察」栏目（knowledge-pages/assets/community-public.json）并发布到 GitHub Pages。固化狭义 ESG 收录口径、条目写入格式、查重与"更新原条目而非重复收录"规则、三项校验（结构/敏感字段/渲染）、以及发布脚本与代理坑的处理。当用户要求"更新 ESG 资讯进展""检索最新 ESG 资讯并整理进去""把 XX 整理到资讯与观察"时使用此技能。
agent_created: true
---

# 资讯与观察：条目更新与发布

## 〇、跨平台环境适配（首次在新机器使用必读）

本技能在 macOS 与 Windows 上均可运行，但**路径、命令写法不同**。开始前先做「环境探测」，把下面 4 个变量定下来，后续所有命令都用变量，不要照抄另一平台的绝对路径。

| 变量 | 含义 | macOS 确定方式 | Windows 确定方式 |
|---|---|---|---|
| `BASE` | 项目根目录（含 knowledge-pages/） | 常见 `~/01 工作/AI项目/AIxESG平台` | 常见 `D:\AIxESG平台` 或在 WorkBuddy 工作区内；用 `dir` 找到含 `knowledge-pages` 的目录 |
| `PY` | Python 3 解释器 | WorkBuddy 受管：`~/.workbuddy/binaries/python/versions/*/bin/python3`；否则 `python3` | `where python` 或 `py -3`；WorkBuddy 受管路径在安装目录下的 `binaries\python\...\python.exe` |
| `NODE` | Node 可执行文件 | WorkBuddy 受管：`~/.workbuddy/binaries/node/versions/*/bin/node`；否则 `node` | `where node`；受管路径在安装目录下的 `binaries\node\...\node.exe` |
| `PWCORE` | playwright-core 模块目录 | `<node 安装目录同级>/workspace/node_modules/playwright-core` | 同理，在 WorkBuddy 的 node workspace 下；用 `npm root -g` 或搜索 `playwright-core` 定位 |

**探测命令（两个平台都要先执行，拿到实际值再继续）**

```bash
# macOS
which python3 node; ls ~/.workbuddy/binaries/python/versions/ ~/.workbuddy/binaries/node/versions/ 2>/dev/null
```

```powershell
# Windows
where python; where node; Get-ChildItem "$env:USERPROFILE\.workbuddy\binaries" -Recurse -Depth 3 -Filter "python.exe" -ErrorAction SilentlyContinue
```

**平台差异速查**

| 事项 | macOS | Windows |
|---|---|---|
| 路径分隔符 / 用户目录 | `/Users/<user>/...` | `C:\Users\<user>\...`，脚本里用 `Path()` 拼接，不要手写反斜杠 |
| 技能目录 | `~/.workbuddy/skills/<skill>/` | `%USERPROFILE%\.workbuddy\skills\<skill>\` |
| 清代理环境变量 | `env -u HTTP_PROXY -u HTTPS_PROXY ...` | PowerShell：`Remove-Item Env:HTTP_PROXY -ErrorAction SilentlyContinue`（逐个清），或 `$env:HTTP_PROXY=''` |
| 本地静态服务 | `$PY -m http.server 8799 --bind 127.0.0.1` | `$PY -m http.server 8799 --bind 127.0.0.1`（同命令可用，PowerShell 里写 `& $PY`） |
| 端口占用检查 | `lsof -nP -iTCP:8799 -sTCP:LISTEN` | `netstat -ano | findstr :8799` |
| 沙箱外执行 | `dangerouslyDisableSandbox: true` | 同（涉及浏览器/网络时仍需授权） |
| Playwright 浏览器路径 | `~/Library/Caches/ms-playwright/...` | `%LOCALAPPDATA%\ms-playwright\...`；**建议不写死 executablePath**，让 playwright 自动定位 |

**原则**：本文件里出现的 `/Users/jinpeng/...`、`127.0.0.1:6960`、`Library/Caches/ms-playwright` 都是 **macOS 原机的历史值**，仅作参考样例。换机器（尤其 Windows）一律先探测、再替换；探测不到就降级（用 PATH 里的 python/node、省略 executablePath、不做代理注入）。

## 一、收录口径（最重要，先确认再检索）

**广义 ESG**（2026-10-29 用户扩围：不再限于披露标准）。收录 ESG 政策、标准、规则与市场动态，按八条线分批检索（每次按线扫，不要泛搜）：
1. 披露标准/准则：财政部可持续披露准则体系、沪深北交易所编制指南、证监会；ISSB/IFRS、GRI、EFRAG/ESRS、SBTi；各法域监管（香港 HKEX/香港会计师公会、欧盟 CSRD/ESRS、英国 FCA/UK SRS、美国 SEC/加州、日韩新马澳加等）；国内行业组织标准（如中汽协团体标准）——须标注"团体标准"层级
2. **ESG 评级与评价**：评级方法/规则的发布与修订、监管对评级活动的规则（如评级机构监管条例）；评级结果的例行更新只在有行业影响时收录
3. **ESG 倡议**：全球性/区域性 ESG 倡议的发起、重大进展或解散（联盟动向、自然相关倡议等）
4. **ESG 会议活动**：政府或官方机构主办的重要会议（COP、金融街论坛等）上与 ESG 相关的规则发布与成果文件
5. **气候变化**：气候政策与法规、气候风险监管动向
6. **碳**：碳市场（配额方案、扩容、碳价重大变化）、碳足迹与碳核算规则、CBAM
7. **绿证绿电**：绿证制度、绿电交易规则与市场动向
8. **绿色金融**：绿色金融政策、目录/分类法、转型金融

**基本质量门槛（仍然适用）**：
- 官方来源优先；只有二手来源时必须写明"某某报道"，不得表述为官方文件
- 旧文（日期与数字不吻合）一律剔除
- 单个企业的 ESG 实践案例、内部制度公告、营销软文、招聘与培训通知不收
- **征求意见的参与方反馈不是标准/政策的进展**（商会、境外机构就某征求意见稿提交意见，不新增条目、也不补 timeline）；但若该反馈本身构成重要市场动向，可按第 3 条线酌情收录并如实标注

## 二、数据位置与结构

- 文件：`<BASE>/knowledge-pages/assets/community-public.json`
  （macOS 原机样例：`/Users/jinpeng/jinpeng/01 工作/AI项目/AIxESG平台/knowledge-pages/assets/community-public.json`；Windows 上形如 `D:\AIxESG平台\knowledge-pages\assets\community-public.json`，以实际探测为准）
- 顶层：`standard_map` / `regions` / `partners` / `questions` / `observations` / `insights`
- `insights`（2026-10-24 新增，「研究洞察」栏目，与资讯动态分开）：收录研究机构报告的外部链接，字段 `id`、`org`（机构）、`category`（会计与鉴证/管理咨询/投行与资管/智库与倡议/评级与数据/国内研究/**券商研究**）、`title`、`date`（YYYY-MM 或 YYYY-MM-DD，持续更新入口可留空）、`summary`、`url`（**必须 https 官方链接，禁臆造**；国际机构站点（PwC/BCG/贝恩/标普）常被 Akamai 拦截 curl 返回 403，但浏览器可正常打开——以浏览器可渲染为准，不因 curl 403 就换链接；券商研报官方页多不公开，用新浪财经研报页/东方财富转载页并注明来源）。**summary 写核心内容**（样本量、关键百分比、主要结论，约 200—350 字），不是一句话简介；insights 列表页已去掉两行截断（community.css：`#insights-page .co-obs-card-body p{display:block;overflow:visible}`），全文直接展示。卡片直接外链（`target="_blank"`），无详情页。对应页面 `insights.html`（`#insights-page`），渲染与分页/搜索函数在 community.js（`publicInsights`/`renderInsight`/`renderInsightsPage`，状态独立 `insState` perPage=12）。列表页排序按 date 倒序，空 date 沉底。
- 「资讯观察」已于 2026-10-24 全站更名「资讯动态」（首页 band、observations.html 标题、详情页返回链接、meta）。
- 条目字段：`id`、`category`、`title`、`date`、`summary`、`content[]`
- `date` 格式 `YYYY-MM-DD` 或 `YYYY-MM`
- `content` 块类型（渲染器只认这 8 种）：
  | type | 必填字段 |
  |---|---|
  | `lead` | `text` |
  | `heading` | `text` |
  | `facts` | `items: [{label, value}]` |
  | `timeline` | `items: [{date, title, detail}]` |
  | `table` | 按既有条目样例 |
  | `list` | `items: [str]` |
  | `note` | `text` |
  | `source` | `label`、`text`、`url`（**url 不可为空**） |
- `category` 沿用词表：`国内政策` `国际标准` `国际监管` `监管动态` `市场动态` `供应链ESG`。**扩围后的归类映射**：评级方法/规则→监管动态（境外评级机构监管→国际监管）；倡议动向→国际标准或市场动态；会议成果→按主办方归属；气候/碳/绿证绿电/绿色金融的政策→国内政策或国际监管，市场价格类动向→市场动态。不改词表、不加新值，避免改渲染与校验。
- 序列化：`json.dump(..., ensure_ascii=False, indent=2)` + 末尾换行
- **条目数组顺序不重要，`timeline` 项顺序很重要**：
  - 顶层 `observations` 数组：渲染层 `assets/community.js`（约 235 行）按 `date` 倒序排序 → 新条目**追加到末尾即可**，不要整体重排（会产生巨大无意义 diff）。
  - 但 `content` 里的 **`timeline.items` 按数组原序输出**（约 447 行只做 map，不排序）→ 给既有条目补时间线时，**必须插到正确的时间位置**，追加到末尾会让时间线倒序。同一时间点也注意别留两条重复项（如笼统的 `2026-10` 与精确的 `2026-10-22` 应合并为精确那条）。

## 三、查重与"更新还是新增"

- 先打印全部现有条目的 `date | category | title`，与本次检索结果比对。
- **同一事件的新进展 → 更新原条目**（补 `timeline` 项、改 `facts`、更新 `summary`），不新增记录。
  例：ESRS 通过（07-03）→ 刊登公报/生效 → 在原条目时间线追加，不另起一条。
- **只有事件层级不同才算新条目**。
  例：UK SRS 准则文本发布（2026-02-25）与 FCA 上市规则 PS26/19（2026-09-30）分属准则层与监管规则层，是两条。
- 写入前对新增条目做 `assert id not in existing_ids` 与标题唯一性断言。
- 条目内部写法：`lead` 一段 → `heading`+`facts` → 可选 `heading`+`list` → 可选 `note`（一句"对企业的关注点"，落到咨询业务视角）→ `source`（官方来源名 + 可查链接）。

## 四、标准流程

先在会话里定好变量（值来自第〇节的探测结果，不要硬抄）：

```bash
# macOS / Linux
B="<项目根目录>"
PY="<python3 路径或 python3>"
NODE="<node 路径或 node>"
mkdir -p "$B/tmp/$(date +%Y%m%d)-observations-update"
```

```powershell
# Windows PowerShell
$B = "<项目根目录>"
$PY = "<python.exe 路径或 python>"
$NODE = "<node.exe 路径或 node>"
New-Item -ItemType Directory -Force "$B\tmp\$(Get-Date -Format yyyyMMdd)-observations-update" | Out-Null
```

脚本内拼接路径**一律用 `pathlib.Path`**（如 `Path(B)/'knowledge-pages'/'assets'/'community-public.json'`），避免 Windows 反斜杠与空格路径问题。

1. **读现状**：打印现有条目清单 + 目标格式样例（至少读一条完整条目）。
2. **检索**：`WebSearch` 按标准线分批，`freshness=d30`（日常更新）或 `y1`（年度盘点）。用 `WebFetch` 核官网（kjs.mof.gov.cn、ifrs.org、efrag.org、fca.org.uk、gri.org、acra.gov.sg、caam.org.cn 等）。
   **官方来源优先**；只有二手来源时必须在 `text` 里写明"某某报道"，不得表述为官方文件。
3. **写入**：写 `tmp/<日期>-observations-update/add_observations.py`，先 `shutil.copy2` 备份（`community-public.json.bak-<HHMMSS>`），再做更新+追加。
4. **三项校验**（见下节脚本要点）。
5. **渲染验证**：本地起服务 + playwright-core。
6. **发布**（**须用户确认**，见第六节）。

## 五、校验与渲染验证

**校验**（纯 Python，直接跑）：结构（字段齐全、块类型在白名单、facts 有 label/value、timeline 有 date/title/detail、source.url 非空）、`id` 与 `title` 零重复、敏感字段扫描（`/Users/`、`jinpeng`、`token`、`api_key`、`sk-`、`ghp_`、`password` 等）。

**渲染验证**：
```bash
cd "$B/knowledge-pages" && $PY -m http.server 8799 --bind 127.0.0.1   # run_in_background
```
```js
// verify.cjs —— 用探测到的 node 运行；playwright-core 路径按第〇节的 PWCORE 替换
const { chromium } = require('<PWCORE>');          // macOS 样例: /Users/<user>/.workbuddy/binaries/node/workspace/node_modules/playwright-core
// 浏览器路径：不写死 executablePath，交给 playwright 自动定位（Windows 在 %LOCALAPPDATA%\ms-playwright）
const browser = await chromium.launch({ headless: true });
```
> 只有 playwright 找不到浏览器时，才显式传 `executablePath`：macOS 在 `~/Library/Caches/ms-playwright/chromium-*/chrome-mac-*/...`，Windows 在 `%LOCALAPPDATA%\ms-playwright\chromium-*\chrome-win\chrome.exe`。
- 列表页：`observations.html`，核对总数文本（`/(\d+)\s*条/`）与横向溢出（`scrollWidth - clientWidth` 应为 0）。**条目卡片选择器是 `a.co-observation-row`**（洞察卡才是 `.co-obs-card`），用错类名会得到"列表内 0 条"的假失败——先 `document.querySelectorAll('a[href]')` 打印 class/href 再定选择器。翻页按钮是 `.co-page-btn`，总数节点 `.co-pagination-total`。
- 详情页：`observation.html?id=<id>`，核对 `<h1>` 非空、无"未找到"、无溢出、无 `pageerror`/`requestfailed`。
- 来源链接：详情页 `a[href]` 中应有指向官方域名的外链（**来源文本本身即超链接**，无独立"打开原件"按钮）。
- 手机视图：viewport 390×844 抽查一条。
- **两类检测都要做，只看页面级 diff 会漏判**：
  1. 页面级：`document.documentElement.scrollWidth - clientWidth` 应为 0。
  2. 元素级：遍历 `p, li, td, h1, h2, h3, div, span, a`，找 `el.scrollWidth > el.clientWidth + 0.5` 的元素。长不可断词（**邮箱、长 URL**）会让文字撑出容器框，但页面级 diff 可能只 +1px 且实际不可横向滚动（`window.scrollTo(50,0)` 后 `scrollX` 仍为 0），极易漏判。**结论：正文与来源说明里不要写邮箱地址或长 URL**，链接只放在 `source.url`。
  3. 校验 `timeline` 顺序要针对 `.co-obs-timeline` 容器内元素取值；用 `body.innerText.indexOf(日期)` 会命中正文其他位置的同字符串日期，产生假异常。
- 结束后 `TaskStop` 停掉本地服务。

## 六、发布（对外动作，须用户确认）

- 发布源：`knowledge-pages/`，公开站 `707292385-byte/aiesg-workbench-downloads`（GitHub Pages）。
- **发布前必须有用户的明确指令**（"发布""上线"）。未经确认不得推送。
- 用 `tmp/20260925-standards-observations/publish_noproxy.py`（复用原 `scripts/publish_community_page.py` 的 validate 与文件清单，但 git 不带 per-URL 代理）。
- **坑 1**：`scripts/publish_community_page.py` 从主仓库 git config 读 `http.https://github.com/.proxy=127.0.0.1:6960`，该代理常未运行 → clone 失败。该脚本的 `--validate-only` 与 `m.validate()` 在当前环境会 exit 137 无输出，**改用第五节的自查脚本**。
- **坑 2（代理，2026-10-22 复核，macOS 原机环境）**：环境变量形式的代理（含 `HTTPS_PROXY=http://127.0.0.1:6960`）对 git **稳定** CONNECT 502，重试无效；curl 走同一代理却正常，属 git 特有。可靠做法：清掉全部代理变量，并给每条 git 命令注入 `-c http.https://github.com/.proxy=http://127.0.0.1:6960`（AtlasCore，git/curl 均可靠）。
  - macOS 写法：`env -u ALL_PROXY -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u all_proxy git -c http.https://github.com/.proxy=http://127.0.0.1:6960 push origin main`
  - **Windows 写法**：先 `Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:ALL_PROXY -ErrorAction SilentlyContinue`；若那台机器走本地代理客户端（Clash/v2ray 等），确认其混合端口后同样注入 `git -c http.https://github.com/.proxy=http://127.0.0.1:<端口> push origin main`；**能直连 GitHub 就不要注入代理**（国内网络常见必须代理，先 `curl -I https://github.com` 测一下）。
  - 沙箱内直连 GitHub 不通（进程被杀），需 `dangerouslyDisableSandbox: true`。
- **坑 2.5（备份落点）**：脚本备份的 `community-public.json.bak-*` 不要留在 `knowledge-pages/assets/`（公开站点目录不放备份），发布后移到 `backups/YYYYMMDD-observations/`。
- **坑 3（CDN 延迟）**：推送成功 ≠ 线上可读。Pages 的 `cache-control: max-age=600`，推送后 CDN 会继续发旧副本，实测约 45–90 秒才刷新。核验必须两步走：
  1. 先 `curl https://raw.githubusercontent.com/707292385-byte/aiesg-workbench-downloads/main/docs/academy/assets/community-public.json` 直读仓库文件 —— 条数对 = 推送确实成功（此刻 Pages 地址可能还是旧条数，属正常）。**Windows 注意**：PowerShell 里 `curl` 是 `Invoke-WebRequest` 的别名，不支持 `-s`/`-x` 这类参数，要用 `curl.exe` 显式调用，或用 `Invoke-RestMethod` 代替。
  2. 再轮询 Pages 地址（带 `?cb=$RANDOM` 破缓存；PowerShell 用 `?cb=$(Get-Random)`），每 45 秒一次最多 6 次，直到条数与本地一致。轮询脚本模式下（`for` 循环）不要用 `set -e`，`python -c` 里用 `try/except` 兜住 JSON 解析失败。
  3. 若长时间不刷新，再查 `curl -sI` 的 `last-modified` / `etag` 判断 CDN 副本新旧；`etag` 首段是字节数的十六进制，可据此换算确认。
- 发布后按「坑 3」两步核验：raw 直读确认推送 → 轮询 Pages 直到条数一致 → 核对新增 `id` 是否在线上。
- 收尾再对**线上站**做一次渲染抽查（把第五节 verify 脚本的 `BASE` 换成 Pages 地址；参考 `tmp/20261011-observations-update/verify_live.cjs`）：列表页总数、改动详情页 h1／无"未找到"／0 溢出、手机 390px、无 JS 错误。跑法：
  ```bash
  # macOS
  env -u ALL_PROXY -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u all_proxy \
    NODE_PATH="<PWCORE 的上一级 node_modules>" "$NODE" <脚本>
  ```
  ```powershell
  # Windows PowerShell
  Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:ALL_PROXY -ErrorAction SilentlyContinue
  $env:NODE_PATH = "<PWCORE 的上一级 node_modules>"; & $NODE <脚本>
  ```
  需 `dangerouslyDisableSandbox: true`（沙箱内浏览器进程会被杀）。
- **坑 4（写脚本用 Write，别用 shell heredoc）**：用 `cat > x.cjs <<'EOF'` 落盘 Node/JS 脚本时，zsh 会把脚本里的 `${Date.now()}`、`${BASE}` 当参数替换，报 `Bad substitution: Date.now`（即使 heredoc 加了引号）；PowerShell 的 here-string（`@'...'@`）同样有插值陷阱。**一律改用 Write 工具直接写文件**。
- **坑 5（破缓存参数把 id 吃掉了，2026-10-25 实测）**：详情页地址本身已有 `?id=xxx`，破缓存参数必须用 `&cb=`；写成 `${BASE}/observation.html?id=${id}?cb=...` 会让 `id` 变成 `xxx?cb=...`，页面正常渲染但一律显示"未找到"——**新旧条目全中，看起来像整站坏了，其实是脚本 bug**。判断方法：拿一条历史条目一起测，若同样"未找到"就是 URL 拼接问题，不是数据问题。列表页无 id 参数，用 `?cb=` 才对。
- **坑 6（非英语专有名词撑出移动端，2026-10-28 实测）**：正文/来源说明里写北欧等语言的标准全名、部门全名、人名（如 `Lagrådsremiss`、`Justitiedepartementet`、`Lättnader i kraven på hållbarhetsrapportering`）会让 390px 下 `co-obs-body` +1px、`co-obs-source` +3px，页面级 diff 仍为 0，极易放行。**判定方法**：拿 2–3 条历史条目同视口跑一次，历史条目为 0 而新条目非 0 = 内容引起，不是样式问题。**处理**：正文与来源说明改中文表述（"立法草案""司法部"），外文原名与完整标题只保留在 `source.url` 指向的官方页面上，不要写进 `source.text`。
- **坑 7（发布门槛的 `password=` 字面量误伤，2026-10-29 实测）**：`scripts/publish_knowledge_pages.py` 的 forbidden 元组里 `password=` 是**子串**匹配，会命中 `assets/community-account.js` 的表单取值代码 `password=fields.get('password')`，导致 `--validate-only` 直接报 `forbidden markers: ['password=']`，看起来像自己写的新条目出问题，实际与本次改动无关。已把该脚本改为正则：只拦 `[?&]password=`（URL 查询参数）与 `password\s*=\s*['"\`]`（硬编码字面量赋值）。**再遇到这条报错，先 `grep -rn "password=" knowledge-pages/` 定位命中文件**，不要为了过门槛去改写正常的表单代码。
- **坑 8（发布脚本选哪个，2026-10-29 实测）**：`scripts/publish_knowledge_pages.py` 可用——它会从项目 git config 读 `user.name`/`user.email`/`http.https://github.com/.proxy` 并以 `-c` 注入每条 git 命令，配合 `env -u` 清掉全部代理变量即可推送成功，无需另写变体脚本。收尾命令：`env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy -u ALL_PROXY <py> scripts/publish_knowledge_pages.py`。
- GitHub Pages 有几分钟缓存，未刷新让用户强刷（Cmd+Shift+R）。

## 七、线上地址

- 列表：`https://707292385-byte.github.io/aiesg-workbench-downloads/academy/observations.html`
- 社区首页：`https://707292385-byte.github.io/aiesg-workbench-downloads/academy/community.html`
- 页面与详情均由 `assets/community.js` 从 `community-public.json` 动态渲染，**无需为新条目手写 HTML**。

## 八、历史坑位记录

- `output/academy-pages-20260914/` 是旧设计稿（news 仅 3 条示例），**正式发布源是 `knowledge-pages/`**，勿混淆。
- 列表页是"搜索框 + 页码分页"（`perPage`/`renderPagination`），**无"加载更多"按钮**；验证新条目可达性要用页内搜索而非点击更多。
- 检索结果里常见的旧文陷阱：搜索引擎会捞到上一年度的报道（如"1869 家披露 2024 年报告"实为 2025 年数据），日期与数字不吻合即剔除，不得当"本周资讯"收录。
- **中文聚合站会把几个月前的文件写成"近日发布"（2026-10-26 实测）**：搜"财政部发布XX征求意见稿"时，`b.15386.cn` 一类文库站转的《加快推进会计数智化工作的指导意见（征求意见稿）》，正文写着"9月21日财政部发布"，页面却无日期、搜索结果读起来像新件。**凡遇财政部/交易所文件，一律回 `kjs.mof.gov.cn/zhengcefabu/` 与 `kjs.mof.gov.cn/gongzuodongtai/` 按文号年份核对**，不要以聚合站转述为时间依据。
- **政府站新闻列表页常是 JS 渲染（2026-10-28 实测，瑞典 regeringen.se）**：`/pressmeddelanden/` 用 WebFetch 只返回"共 10401 条"没有条目，用 `/rattsliga-dokument/lagradsremiss/` 这类按文种归档的列表页反而能拿到带日期的条目。找到文件后下载 PDF，用 pypdf 抽文本核对门槛数字、条件个数（"满足两项以上"还是"须同时满足两项"）与生效日，**不要用二手英文聚合站（如 DailySweden）的数字**——它的阈值描述与官方条文可能不一致。
- **核验 raw 直读要带代理（2026-10-16 实测，macOS 原机）**：该机直连 `raw.githubusercontent.com` 不通（`curl` 返回 `status=000`），必须加 `-x http://127.0.0.1:6960`；而 `707292385-byte.github.io` 可直连。即：raw 确认推送走本机代理端口，Pages 轮询直连即可。**换机器要重新判断**：先 `curl -I https://raw.githubusercontent.com` 测通不通，通就直连，不通再找该机的代理端口。
- **8799 端口可能被遗留服务占用（2026-10-16 实测）**：起本地静态服务前先查占用（macOS `lsof -nP -iTCP:8799 -sTCP:LISTEN`；Windows `netstat -ano | findstr :8799`）；若已有 `http.server 8799` 且 cwd 就是 `knowledge-pages`，直接复用它做渲染验证即可（不要因为 `Address already in use` 就以为要换端口；换端口会让上一次遗留进程继续挂着；Windows 上多余进程用 `taskkill /PID <pid> /F` 清掉）。
- **条目"新增 vs 更新"的判据（2026-10-16 复核）**：先打印现有条目的 `date | category | title` 与候选事件逐条比对。同一发布机构、同一份规则/准则的下一个里程碑（包括原条目已写成"待批/待定/取决于 XX"的步骤）→ 更新原条目，`date` 保持原值（与 `eu-esrs-revision-2026` 保留 2026-07-03 的先例一致）；换了发布机构、换了规则层级（准则文本层 vs 监管规则层）、或换了法域 → 新增条目。若原条目已把两条线（如联邦+州、指令+成员国转化）合并为一个观察，新增时只写新事件本体，同时把旧条目里已过期的"待定"表述改掉，两处不重复同一批明细。
  日期保持原值时的写法约束：原条目若停在"拟/计划/待发布"，标题不要写死新日期动作（「XX于10月22日发布」会与卡片上的旧日期打架），改用阶段式表述（「XX进入征求意见阶段」），把确切日期放进 `summary`、`facts`、`timeline` 三处，列表日期只作事件基准日。
