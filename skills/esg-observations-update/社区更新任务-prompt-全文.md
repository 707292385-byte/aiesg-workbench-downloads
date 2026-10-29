# 每日 23:00 社区更新任务 — 完整任务说明（粘贴到新电脑定时任务，路径需按新机器替换）

任务：更新 AIxESG 平台「资讯动态」与「研究洞察」两个栏目（检索→整理入库→推送上线）。这是每天晚上运行的定期更新，发布上线属于本任务的既定动作。

工作目录：<新路径>/AIxESG平台
数据文件：knowledge-pages/assets/community-public.json
务必先加载技能 esg-observations-update，严格按其口径与坑位记录执行（代理、CDN 延迟、heredoc、破缓存参数、溢出检测等）。

一、栏目 A：资讯动态（observations）
收录口径（2026-10-29 用户扩围：不再限于披露标准，收广义 ESG 政策、标准与市场动态）。按以下八条线分批检索近 1 天（自上次更新以来）的动态，不要泛搜：
1) 披露标准/准则：财政部可持续披露准则体系、沪深北交易所编制指南、证监会；ISSB/IFRS、GRI、EFRAG/ESRS、SBTi；各法域监管（香港 HKEX／香港会计师公会、欧盟 CSRD/ESRS、英国 FCA/UK SRS、美国 SEC／加州、日韩新马澳加等）；国内行业组织标准（须标注"团体标准"层级）；
2) ESG 评级与评价：评级方法/规则的发布与修订、监管对评级活动的规则（如评级机构监管条例）；评级结果的例行更新只在有行业影响时收录；
3) ESG 倡议：全球性/区域性 ESG 倡议的发起、重大进展或解散（联盟动向、自然相关倡议等）；
4) ESG 会议活动：政府或官方机构主办的重要会议（COP、金融街论坛等）上与 ESG 相关的规则发布与成果文件；
5) 气候变化：气候政策与法规、气候风险监管动向；
6) 碳：碳市场（配额方案、扩容、碳价重大变化）、碳足迹与碳核算规则、CBAM；
7) 绿证绿电：绿证制度、绿电交易规则与市场动向；
8) 绿色金融：绿色金融政策、目录/分类法、转型金融。
基本质量门槛（仍然适用）：官方来源优先，二手来源必须写明"某某报道"；旧文（日期与数字不吻合）剔除；单个企业的 ESG 实践案例、内部制度公告、营销软文、招聘与培训通知不收。征求意见的参与方反馈不是标准/政策的进展（不补 timeline），但若该反馈本身构成重要市场动向可按第 3 条线酌情收录并如实标注。

二、栏目 B：研究洞察（insights）
收录研究机构发布的研究报告的外部链接（这是与资讯动态分开的栏目，卡片直接外链、无详情页）：
1) 类别范围（词表）：会计与鉴证／管理咨询／投行与资管／智库与倡议／评级与数据／国内研究／券商研究；
2) 检索方式：以机构官网报告页为主（Deloitte/PwC/EY/KPMG、BCG/贝恩/麦肯锡、S&P Global/MSCI、WRI/CDP/Ceres 等智库，国内研究机构，以及券商 ESG 系列研报），按近 1~7 天的新发布检索，不要重复翻旧目录；
3) 字段要求：id、org（机构）、category（上面词表内）、title、date（YYYY-MM 或 YYYY-MM-DD）、summary（200—350 字，写核心内容：样本量、关键百分比、主要结论，不是一句话简介）、url（必须 https，禁臆造；国际机构站点常被 Akamai 拦截 curl 403 但浏览器可正常打开——以浏览器可渲染为准，不因 curl 403 就换链接；券商研报官方页多不公开，用新浪财经研报页/东方财富转载页并在 summary 注明转载来源）；
4) 查重：先打印现有 insights 的 date | category | org | title，与候选逐一比对；同一报告同一 URL 不重复收；同一系列报告的新一期（如季报新一期）算新条目；title 或 id 重复必须先断言拦截。

三、执行步骤（两个栏目共用）
1) 读现状：分别打印 observations 全部条目的 date | category | title，和 insights 全部条目的 date | category | org | title。observations 同一事件的新进展 → 更新原条目（补 timeline 项／改 facts／更新 summary），不新增记录；只有事件层级不同才新增。写入前做 id 与标题唯一性断言。
2) 检索与核验：WebSearch 按线分批（freshness=d1，insights 可放宽到 d7），用 WebFetch 核官方站点（kjs.mof.gov.cn、ifrs.org、efrag.org、fca.org.uk、gri.org、hkexnews.hk、acra.gov.sg 等）。官方来源优先；只有二手来源时必须写明"某某报道"，不得表述为官方文件。旧文（日期与数字不吻合）一律剔除。
3) 写入：先 shutil.copy2 备份 community-public.json 为 .bak-<HHMMSS>，再写脚本更新/追加（脚本用 Write 工具落盘，不要 heredoc）。observations 新条目追加到数组末尾不要整体重排；timeline.items 按数组原序输出，补时间线必须插到正确时间位置。insights 新条目同样追加到 insights 数组末尾。
4) 三项校验（两个数组都过一遍）：结构（observations：字段齐全、块类型在 8 种白名单、facts 有 label/value、timeline 有 date/title/detail、source.url 非空；insights：七字段齐全、category 在词表、summary 200—350 字、url 为 https 非空）、id 与 title 零重复、敏感字段扫描（/Users/、jinpeng、token、api_key、sk-、ghp_、password）。
5) 渲染验证：本地起 127.0.0.1:8799 静态服务 + playwright-core（脚本一律 Write 落盘；需 dangerouslyDisableSandbox）。observations：列表页总数文本、详情页 h1 非空且无"未找到"、页面级与元素级横向溢出均为 0（正文与来源说明里不写邮箱或长 URL；非英语专有名词长串一律改中文表述）、来源外链指向官方域名、手机 390×844 抽查一条。insights：核对 insights.html 列表卡片总数与新增条目可达、卡片外链 href 与写入 url 一致、页面 0 溢出、无 JS 错误。跑完停掉本地服务。
6) 发布上线：用 tmp/20260925-standards-observations/publish_noproxy.py 推送到公开站 707292385-byte/aiesg-workbench-downloads（GitHub Pages）。git 报 CONNECT 502 直接重试。发布后把 assets/ 下的 .bak-* 备份移到 backups/YYYYMMDD-observations/。
7) 线上核验两步走：先 curl raw.githubusercontent.com（带 -x http://127.0.0.1:6960）直读仓库文件确认推送成功；再轮询 Pages 地址（带 ?cb=$RANDOM 破缓存，每 45 秒一次最多 6 次）直到条数与本地一致；最后对线上站做一次渲染抽查（observations 列表页总数、本期改动详情页 h1／无"未找到"／0 溢出／无 JS 错误；insights 页卡片数）。

四、中止条件（宁可不发）
三项校验或渲染验证任一不通过、或两个栏目本期均无可收录内容时：不要推送，保留本地改动，在汇报里说明卡在哪一步。绝不为了凑数收录来源可疑的资讯或研报链接，绝不把二手来源写成官方文件。注意：若某一栏目有更新、另一栏目为 0，仍正常推送（一次发布覆盖两个栏目）；只有两个栏目都为 0 才不推送。

五、交付汇报
输出：资讯动态本期新增/更新条目清单（id／标题／发布机构／日期／来源链接）与研究洞察本期新增清单（id／机构／类别／标题／日期／链接）、检索中被剔除的"看着像但不合口径"的事件及原因、校验与线上核验结果、线上 commit 与页面地址（资讯动态 https://707292385-byte.github.io/aiesg-workbench-downloads/academy/observations.html ；研究洞察 https://707292385-byte.github.io/aiesg-workbench-downloads/academy/insights.html ）。若某栏目为 0 条，说明检索范围与原因。
