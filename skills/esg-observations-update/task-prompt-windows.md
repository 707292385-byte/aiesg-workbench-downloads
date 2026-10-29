# 每日 23:00 社区更新任务 — Windows 版任务说明

> 用法：在 Windows 那台电脑的 WorkBuddy 里新建定时任务（每天 23:00），把下面「任务说明」整段粘贴；
> 开头的 `<项目根目录>` 换成实际路径（如 `D:\AIxESG平台`）。其余照抄，路径一律由技能第〇节探测后动态确定。

---

**任务说明**

任务：更新 AIxESG 平台「资讯动态」与「研究洞察」两个栏目（检索→整理入库→推送上线）。这是每天晚上运行的定期更新，发布上线属于本任务的既定动作。

工作目录：`<项目根目录>`（Windows 路径，含 `knowledge-pages` 子目录）
数据文件：`<项目根目录>\knowledge-pages\assets\community-public.json`

**第一步（每次执行都要做）**：加载技能 `esg-observations-update`，按它第〇节「跨平台环境适配」探测并确定 4 个变量：`BASE`（项目根目录）、`PY`（python.exe）、`NODE`（node.exe）、`PWCORE`（playwright-core 模块目录）。Windows 上优先用 `where python` / `where node`，找不到再用 WorkBuddy 安装目录下 `binaries\` 里的受管版本。所有脚本内路径用 `pathlib.Path` 拼接，不要手写反斜杠。

一、栏目 A：资讯动态（observations）
收录口径（2026-10-29 用户扩围：不再限于披露标准，收广义 ESG 政策、标准与市场动态）。按八条线分批检索近 1 天（自上次更新以来）的动态，不要泛搜：
1) 披露标准/准则：财政部可持续披露准则体系、沪深北交易所编制指南、证监会；ISSB/IFRS、GRI、EFRAG/ESRS、SBTi；各法域监管（香港 HKEX／香港会计师公会、欧盟 CSRD/ESRS、英国 FCA/UK SRS、美国 SEC／加州、日韩新马澳加等）；国内行业组织标准（须标注"团体标准"层级）；
2) ESG 评级与评价：评级方法/规则的发布与修订、监管对评级活动的规则；评级结果的例行更新只在有行业影响时收录；
3) ESG 倡议：全球性/区域性 ESG 倡议的发起、重大进展或解散；
4) ESG 会议活动：政府或官方机构主办的重要会议上与 ESG 相关的规则发布与成果文件；
5) 气候变化：气候政策与法规、气候风险监管动向；
6) 碳：碳市场（配额方案、扩容、碳价重大变化）、碳足迹与碳核算规则、CBAM；
7) 绿证绿电：绿证制度、绿电交易规则与市场动向；
8) 绿色金融：绿色金融政策、目录/分类法、转型金融。
质量门槛：官方来源优先，二手来源写明"某某报道"；旧文（日期与数字不吻合）剔除；单个企业实践案例、内部制度公告、营销软文、招聘培训通知不收；征求意见的参与方反馈不算标准进展（不补 timeline）。

二、栏目 B：研究洞察（insights）
收录研究机构报告的外部链接：类别词表为 会计与鉴证／管理咨询／投行与资管／智库与倡议／评级与数据／国内研究／券商研究；以机构官网报告页为主，按近 1~7 天新发布检索；字段 id、org、category、title、date、summary（200—350字，写样本量/关键百分比/主要结论）、url（https，禁臆造；券商研报用新浪财经或东方财富转载页并注明）；查重先打印现有清单比对，同 URL 不重复收。

三、执行步骤
1) 读现状：打印 observations 的 `date | category | title` 与 insights 的 `date | category | org | title`。同一事件新进展→更新原条目（补 timeline／改 facts／改 summary），事件层级不同才新增。写入前做 id 与标题唯一性断言。
2) 检索与核验：WebSearch 按线分批（freshness=d1，insights 可放宽 d7），WebFetch 核官方站点（kjs.mof.gov.cn、ifrs.org、efrag.org、fca.org.uk、gri.org、hkexnews.hk、acra.gov.sg 等）。
3) 写入：先用脚本备份 community-public.json 为 `.bak-<HHMMSS>`，再写 Python 脚本更新/追加（脚本用 Write 工具落盘，不要用 here-string/heredoc）。observations 新条目追加到末尾，不整体重排；timeline.items 按数组原序，补时间线必须插到正确位置。序列化 `json.dump(..., ensure_ascii=False, indent=2)` + 末尾换行。
4) 三项校验：结构（字段齐全、块类型在 8 种白名单、facts 有 label/value、timeline 有 date/title/detail、source.url 非空；insights 七字段齐全、category 在词表、summary 200—350 字、url 为 https）、id 与 title 零重复、敏感字段扫描（`/Users/`、`C:\\Users\\`、`jinpeng`、`token`、`api_key`、`sk-`、`ghp_`、`password`）。
5) 渲染验证：本地起 `127.0.0.1:8799` 静态服务（`& $PY -m http.server 8799 --bind 127.0.0.1`），用受管 node + playwright-core 跑校验脚本（不写死 executablePath，让 playwright 自动找浏览器；Windows 浏览器在 `%LOCALAPPDATA%\ms-playwright`）。检查：列表页总数文本、详情页 h1 非空且无"未找到"、页面级与元素级横向溢出为 0、来源外链指向官方域名、390×844 手机抽查；insights 页卡片数与新增条目可达、外链 href 与写入 url 一致。跑完停掉本地服务（`taskkill` 或停 TaskStop）。
6) 发布上线（属本任务既定动作）：用 `scripts/publish_knowledge_pages.py`，推送前清代理环境变量（PowerShell `Remove-Item Env:HTTP_PROXY,Env:HTTPS_PROXY,Env:ALL_PROXY -ErrorAction SilentlyContinue`）；若该机必须过代理才能上 GitHub，先 `curl.exe -I https://github.com` 测通，然后给 git 命令注入 `-c http.https://github.com/.proxy=http://127.0.0.1:<端口>`；git 报 CONNECT 502 直接重试。发布后把 assets 下的 `.bak-*` 移到 `backups\YYYYMMDD-observations\`。
7) 线上核验：先 `curl.exe` 直读 raw.githubusercontent.com 上 `docs/academy/assets/community-public.json` 确认推送成功（Windows 上必须用 curl.exe，不能用 PowerShell 的 curl 别名）；再轮询 Pages 地址（`?cb=$(Get-Random)` 破缓存，每 45 秒一次最多 6 次）直到条数一致；最后对线上站做一次渲染抽查。

四、中止条件（宁可不发）
三项校验或渲染验证任一不通过、或两栏目本期均无可收录内容时：不推送，保留本地改动，在汇报里说明卡在哪一步。某栏目有更新、另一栏目为 0 时仍正常推送；两栏目都为 0 才不推送。

五、交付汇报
输出：资讯动态本期新增/更新清单（id／标题／发布机构／日期／来源链接）、研究洞察本期新增清单（id／机构／类别／标题／日期／链接）、被剔除的"看着像但不合口径"的事件及原因、校验与线上核验结果、线上 commit 与页面地址（资讯动态 https://707292385-byte.github.io/aiesg-workbench-downloads/academy/observations.html ；研究洞察 https://707292385-byte.github.io/aiesg-workbench-downloads/academy/insights.html ）。若某栏目为 0 条，说明检索范围与原因。
