/* 港交所ESG披露体系目录页：与 MSCI/A股/财政部目录页共用同一套 mp-/mh- 视觉体系。 */
(function () {
  'use strict';
  const number = value => String(value).padStart(2, '0');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const clip = (value, limit = 84) => { const text = clean(value); return text.length > limit ? `${text.slice(0, limit)}…` : text; };

  /* 官方文件短名（人工映射，文件名里带 ESG Academy 字样，机器缩略会读不通） */
  const SHORT_NAMES = {
    '《环境、社会及管治报告守则》（附录C2）与气候披露要求——港交所ESG Academy·规则与规例': '《环境、社会及管治报告守则》（附录C2）',
    '《香港交易所环境、社会及管治框架下气候信息披露的实施指引》（PDF）': '《气候信息披露实施指引》',
    '《Linking the ISSB Standards and HKEX ESG Reporting Code》（PDF）': 'Linking the ISSB Standards and HKEX ESG Reporting Code',
    '港交所 ESG Academy（学习与规则入口）': '港交所 ESG Academy',
  };
  const shortFile = name => SHORT_NAMES[clean(name)] || clean(name);

  /* 官方文件按效力分层：规则依据（附录C2守则）→ 实施指引 → 学习入口；每份文件只归入第一个命中的层级 */
  const fileLayers = [
    { layer: '规则依据', core: true, title: '《ESG报告守则》与气候披露要求', note: '《上市规则》附录C2 · 强制披露与「不遵守就解释」并存', match: name => name.includes('报告守则') },
    { layer: '实施指引', title: '气候披露实施与 ISSB 关联', note: '气候披露的对齐路径、生效安排与实施宽免说明', match: name => name.includes('实施指引') || name.includes('Linking') },
    { layer: '学习入口', title: '港交所 ESG Academy', note: '官方学习平台与规则查询入口', match: name => name.includes('Academy') },
  ];

  /* 气候披露：模块1是前提，模块2-5 对齐 ISSB S2 四支柱（锚点指向学习目录对应分组） */
  const CLIMATE = { baseIndex: 4, pillars: [5, 6, 7, 8] };

  /* 分组短标签（供目录跳转与分组角标使用） */
  const GROUP_LABELS = {
    'hkex-1': '守则基础', 'hkex-2': '编备方法', 'hkex-3': '环境 KPI', 'hkex-4': '社会 KPI',
    'hkex-5': '气候·概念与宽免', 'hkex-6': '气候·管治', 'hkex-7': '气候·策略', 'hkex-8': '气候·风险管理', 'hkex-9': '气候·指标目标',
  };

  window.renderHkexStandardV2 = function ({ standard, esc, href }) {
    const groups = standard.groups || [];
    const files = standard.officialFiles || [];
    const topicCount = groups.reduce((sum, group) => sum + group.items.length, 0);
    const homeUrl = href('index.html');
    const topicHref = id => href('topic.html', { standard: standard.id, id });

    const topbar = `<header class="mp-topbar"><div class="mp-topbar-inner">
      <a class="mp-brand" href="${homeUrl}"><span>港</span>港交所ESG披露体系解读</a>
      <nav>${[['#framework', '披露体系'], ['#climate', '气候框架'], ['#topics', '学习目录'], ['#sources', '来源']].map(([target, label]) => `<a href="${target}">${label}</a>`).join('')}</nav>
    </div></header>`;

    const hero = `<section class="mh-hero"><div class="mh-hero-inner">
      <div class="mh-crumb"><a href="${homeUrl}">知识学堂</a><span>/</span>港交所ESG披露体系</div>
      <div class="mh-hero-grid"><div>
        <span class="mp-eyebrow">${esc(standard.eyebrow || '香港上市规则与实施指引')} · DISCLOSURE</span>
        <h1>${esc(standard.title)}</h1><p>${esc(standard.description)}</p>
        <div class="mp-hero-tags">${['附录C2 · ESG报告守则', '气候披露对齐 ISSB', '不遵守就解释', '26 个知识主题'].map(value => `<span>${esc(value)}</span>`).join('')}</div>
      </div><div class="mp-hero-side">
        <article><small>知识主题</small><strong>${topicCount}</strong></article>
        <article><small>学习模块</small><strong>${groups.length}</strong></article>
        <article><small>气候披露模块</small><strong>${groups.filter(group => group.title.startsWith('气候披露')).length}</strong></article>
        <article><small>官方文件</small><strong>${files.length}</strong></article>
      </div></div>
    </div></section>`;

    /* 01 披露体系：官方文件按效力分层 */
    const fileHome = new Map();
    files.forEach(file => {
      const home = fileLayers.find(layer => layer.match(file.name));
      if (home && !fileHome.has(file)) fileHome.set(file, home);
    });
    const archNodes = fileLayers.map(layer => {
      const items = files.filter(file => fileHome.get(file) === layer);
      const list = items.length ? `<ul>${items.map(file => `<li><a href="${esc(file.url)}" target="_blank" rel="noreferrer">${esc(shortFile(file.name))}</a></li>`).join('')}</ul>` : '';
      return `<div class="as-arch-node${layer.core ? ' is-core' : ''}"><span>${esc(layer.layer)}</span><b>${esc(layer.title)}</b><em>${esc(layer.note)}</em>${list}</div>`;
    }).join('');

    /* 02 气候披露框架：模块1前提 → 四支柱（对齐 ISSB S2） */
    const climatePillars = CLIMATE.pillars.map(groupIndex => {
      const group = groups[groupIndex];
      if (!group) return '';
      return `<a href="#hk-group-${groupIndex}"><b>${esc(GROUP_LABELS[group.id]?.replace('气候·', '') || group.title)}</b><span>${number(groupIndex + 1)}</span></a>`;
    }).join('');
    const climateBase = groups[CLIMATE.baseIndex];
    const climateCard = `<div class="hk-climate mp-card" aria-label="气候披露框架：先掌握核心概念与实施宽免，再按四支柱进入披露要求">
      <div class="hk-climate-base">
        <span>前提</span>
        <b>${esc(climateBase ? climateBase.title.replace(/^气候披露 · /, '') : '核心概念与实施宽免')}</b>
        <p>IFRS S1 核心概念、适用安排与实施宽免，决定气候披露从哪一版口径开始</p>
        <a href="#hk-group-${CLIMATE.baseIndex}">查看模块 →</a>
      </div>
      <div class="hk-climate-gate" aria-hidden="true">→</div>
      <div class="hk-climate-four">
        <small>气候披露四支柱 · 按管治、策略、风险管理、指标及目标展开</small>
        <div class="hk-climate-grid">${climatePillars}</div>
      </div>
    </div>`;

    /* 03 学习目录：ESG 模块 + 气候披露模块 */
    const jump = groups.map((group, groupIndex) => [`#hk-group-${groupIndex}`, GROUP_LABELS[group.id] || group.title])
      .map(([target, label]) => `<a href="${target}">${esc(label)}<span>→</span></a>`).join('');
    const pillars = groups.map((group, groupIndex) => {
      const isClimate = group.title.startsWith('气候披露');
      const label = isClimate ? `气候披露 · 模块${number(groupIndex - CLIMATE.baseIndex + 1)}` : `ESG 模块 ${number(groupIndex + 1)}`;
      const title = clean(group.title.replace(/^气候披露 · /, '').replace(/^模块\d+ · /, ''));
      return `<section class="mh-pillar mp-card" id="hk-group-${groupIndex}">
        <header><div><small>${number(groupIndex + 1)} · ${esc(label)}</small><h3>${esc(title)}</h3></div><strong>${group.items.length} 个主题</strong></header>
        <div class="mh-theme"><div class="mh-topic-grid">${group.items.map(item => `
          <a class="mh-topic-card" href="${topicHref(item.id)}">
            <h4>${esc(item.title)}</h4><p>${esc(clip(item.summary, 72))}</p>
            <div><span>${esc(item.meta?.[1] || '')}</span><b>查看解读 →</b></div>
          </a>`).join('')}</div></div>
      </section>`;
    }).join('');

    return `<div class="msci-hub-page hk-standard-page">
      ${topbar}
      ${hero}
      <main class="mh-page">
        <a class="mh-back" href="${homeUrl}">← 返回知识学堂</a>

        <section class="mp-section" id="framework">
          <div class="mp-section-head"><div class="mp-section-title"><span>01</span><h2>披露体系</h2></div><p>披露责任出自《上市规则》附录C2《ESG报告守则》：强制披露与「不遵守就解释」并存，气候披露按实施指引对齐 ISSB</p></div>
          <div class="as-arch">${archNodes}</div>
          <p class="mh-usage-note">过渡安排与适用条件按发行人板块与生效年份分阶段执行，判断方式见模块1「IFRS S1核心概念」与「实施宽免」。</p>
        </section>

        <section class="mp-section" id="climate">
          <div class="mp-section-head"><div class="mp-section-title"><span>02</span><h2>气候披露框架</h2></div><p>先掌握核心概念与实施宽免，再按四支柱进入具体披露要求</p></div>
          ${climateCard}
        </section>

        <section class="mp-section" id="topics">
          <div class="mp-section-head"><div class="mp-section-title"><span>03</span><h2>学习目录</h2></div><p>4 个 ESG 模块讲守则与 KPI 方法，5 个气候披露模块按 ISSB S2 四支柱展开</p></div>
          <div class="mh-pillar-jump">${jump}</div>
          <div class="mh-pillar-stack">${pillars}</div>
        </section>

        <section class="mp-section" id="sources">
          <div class="mp-section-head"><div class="mp-section-title"><span>04</span><h2>来源与说明</h2></div><p>正式披露前请核对港交所现行规则与实施指引</p></div>
          <div class="mh-source mh-source-pair mp-card">
            <div><small>页面内容版本</small><p>${esc(standard.sourceNote || '')}</p></div>
            <div><small>使用说明</small><p>${esc(standard.notice || '')}</p></div>
          </div>
        </section>
      </main>
      <footer class="mp-footer"><div><span>AI × ESG 工作台 · 方法论拆解与知识关联</span><span>正式内容以发布机构现行文件为准</span></div></footer>
    </div>`;
  };
})();
