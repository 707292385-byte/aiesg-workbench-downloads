/* A股指引目录页：与 MSCI 方法论页共用同一套 mp-/mh- 视觉体系。 */
(function () {
  'use strict';
  const number = value => String(value).padStart(2, '0');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const clip = (value, limit = 84) => { const text = clean(value); return text.length > limit ? `${text.slice(0, limit)}…` : text; };
  const SECTION_PREFIX = /^第[一二三四五六七八九十]+节\s*/;
  const pickDate = name => { const match = String(name || '').match(/\d{4}-\d{2}-\d{2}/); return match ? match[0] : ''; };
  const cleanFileName = name => String(name || '').replace(/（[^）]*(?:\d{4}-\d{2}-\d{2}|〔\d{4}〕|\d{4}-\d{2}|\d{4}年)[^）]*）/g, '').trim();
  const shortFile = name => cleanFileName(name)
    .replace('上海证券交易所', '上交所').replace('深圳证券交易所', '深交所').replace('北京证券交易所', '北交所')
    .replace(/^中国证监会[：:]/, '');

  /* 条文定位：meta 第三段是条款列表（如“第二十一条、第二十二条…”），收敛为短标签 */
  function articleLabel(meta) {
    const raw = clean(meta).split('、').filter(Boolean);
    if (!raw.length) return '';
    if (raw.length === 1) return raw[0];
    if (raw.length === 2) return `${raw[0]}、${raw[1]}`;
    return `${raw[0]} 等${raw.length}条`;
  }

  /* 方法拆解卡片的落脚关键词（取自各拆解页的实际内容） */
  const methodFocus = {
    'ashare-framework': '四要素框架 · 21项议题',
    'ashare-materiality': '财务重要性 · 影响重要性',
    'ashare-process': '适用范围 · 报告边界 · 审议程序',
    'ashare-governance': '董事会 · 管理层 · 内部机构',
  };

  /* 双重重要性判定（《指引》第五条）：任一维度重要即为重要性议题，按四要素披露 */
  const dualNodes = [
    { name: '财务重要性', desc: '议题预期在短期、中期或长期内对公司商业模式、财务状况、经营成果、现金流等产生重大影响' },
    { name: '影响重要性', desc: '公司在议题上的表现会对经济、社会和环境产生重大影响' },
  ];
  const fourElements = ['治理', '战略', '影响、风险和机遇管理', '指标与目标'];

  /* 官方文件按效力层级归类（本页口径：A股交易所披露规则；财政部准则属另一体系，不列入） */
  const fileLayers = [
    { layer: '监管统筹', title: '可持续披露规则体系', note: '中国证监会 · 统筹披露框架与时间线', match: name => name.includes('证监会') },
    { layer: '规则强制 · 交易所指引', core: true, title: '可持续发展报告指引', note: '沪深北三所 · 2024-05-01 起实施', match: name => name.includes('指引') && !name.includes('编制指南') },
    { layer: '实施指导 · 编制指南', title: '报告编制指南', note: '总体要求与分议题应用指南', match: name => name.includes('编制指南') },
  ];

  const themeGroups = items => {
    const result = [];
    items.forEach(item => {
      const key = clean(String(item.eyebrow || '').replace(SECTION_PREFIX, '')) || '其他';
      let group = result.find(entry => entry.title === key);
      if (!group) { group = { title: key, items: [] }; result.push(group); }
      group.items.push(item);
    });
    return result;
  };

  window.renderAshareStandardV2 = function ({ standard, esc, href }) {
    const groups = standard.groups || [];
    const methodGroup = groups.find(group => group.title === '方法论') || { items: [] };
    const issueGroups = groups.filter(group => group !== methodGroup);
    const issueCount = issueGroups.reduce((sum, group) => sum + group.items.length, 0);
    const files = standard.officialFiles || [];
    /* 每份文件只归入第一个命中的效力层级（财政部准则不属于本页口径，不匹配任何层级） */
    const fileHome = new Map();
    files.forEach(file => {
      const home = fileLayers.find(layer => layer.match(file.name));
      if (home && !fileHome.has(file)) fileHome.set(file, home);
    });
    const homeUrl = href('index.html');

    const topbar = `<header class="mp-topbar"><div class="mp-topbar-inner">
      <a class="mp-brand" href="${homeUrl}"><span>A</span>A股披露指引解读</a>
      <nav>${[['#framework', '披露框架'], ['#methods', '方法拆解'], ['#topics', '议题目录'], ['#sources', '来源']].map(([target, label]) => `<a href="${target}">${label}</a>`).join('')}</nav>
    </div></header>`;

    const hero = `<section class="mh-hero"><div class="mh-hero-inner">
      <div class="mh-crumb"><a href="${homeUrl}">知识学堂</a><span>/</span>A股上市公司可持续发展报告指引</div>
      <div class="mh-hero-grid"><div>
        <span class="mp-eyebrow">${esc(standard.eyebrow || '境内交易所披露规则')} · DISCLOSURE</span>
        <h1>${esc(standard.title)}</h1><p>${esc(standard.description)}</p>
        <div class="mp-hero-tags">${['沪 · 深 · 北交易所', '2024-05-01 起实施', '双重重要性', '条款定位'].map(value => `<span>${esc(value)}</span>`).join('')}</div>
      </div><div class="mp-hero-side">
        <article><small>披露议题</small><strong>${issueCount}</strong></article>
        <article><small>议题分类</small><strong>${issueGroups.length}</strong></article>
        <article><small>方法拆解</small><strong>${methodGroup.items.length}</strong></article>
        <article><small>官方文件</small><strong>${fileHome.size}</strong></article>
      </div></div>
    </div></section>`;

    const pillarJump = issueGroups.map((group, index) => [`#pillar-${index}`, group.title]).map(([target, label]) =>
      `<a href="${target}">${esc(label)}<span>→</span></a>`).join('');

    const moduleCards = methodGroup.items.map((item, index) => `
      <a class="mh-module-card mp-card" href="${href('topic.html', { standard: standard.id, id: item.id })}">
        <span class="mh-card-number">${number(index + 1)}</span><small>方法模块</small>
        <h3>${esc(item.title)}</h3><p>${esc(clip(item.summary, 72))}</p>
        <div><b>${esc(methodFocus[item.id] || '')}</b><span>查看拆解 →</span></div>
      </a>`).join('');

    const pillars = issueGroups.map((group, groupIndex) => {
      const chapter = clean(group.items[0]?.meta?.[0] || '');
      return `<section class="mh-pillar mp-card" id="pillar-${groupIndex}" data-pillar="${groupIndex}">
        <header><div><small>${number(groupIndex + 1)} · ${esc(chapter)}</small><h3>${esc(group.title)}</h3></div><strong>${group.items.length} 项披露议题</strong></header>
        ${themeGroups(group.items).map(theme => `<div class="mh-theme"><div class="mh-theme-title"><h4>${esc(theme.title)}</h4><span>${theme.items.length}</span></div><div class="mh-topic-grid">${theme.items.map(item => `
          <a class="mh-topic-card" href="${href('topic.html', { standard: standard.id, id: item.id })}">
            <h4>${esc(item.title)}</h4><p>${esc(clip(item.summary, 72))}</p>
            <div>${articleLabel(item.meta?.[2]) ? `<span>${esc(articleLabel(item.meta?.[2]))}</span>` : ''}<b>查看解读 →</b></div>
          </a>`).join('')}</div></div>`).join('')}
      </section>`;
    }).join('');

    const archNodes = fileLayers.map(layer => {
      const items = files.filter(file => fileHome.get(file) === layer);
      const list = items.length ? `<ul>${items.map(file => `<li><a href="${esc(file.url)}" target="_blank" rel="noreferrer">${esc(shortFile(file.name))}</a>${pickDate(file.name) ? `<small>${pickDate(file.name)}</small>` : ''}</li>`).join('')}</ul>` : '';
      return `<div class="as-arch-node${layer.core ? ' is-core' : ''}"><span>${esc(layer.layer)}</span><b>${esc(layer.title)}</b><em>${esc(layer.note)}</em>${list}</div>`;
    }).join('');

    return `<div class="msci-hub-page">
      ${topbar}
      ${hero}
      <main class="mh-page">
        <a class="mh-back" href="${homeUrl}">← 返回知识学堂</a>

        <section class="mp-section" id="framework">
          <div class="mp-section-head"><div class="mp-section-title"><span>01</span><h2>披露框架</h2></div><p>议题经双重重要性判定后，按四要素框架披露，条款落到沪深北三所</p></div>
          <div class="as-dual mp-card" aria-label="双重重要性判定：任一维度重要即为重要性议题，按四要素框架披露">
            <div class="as-dual-left">
              ${dualNodes.map(node => `<div class="as-dual-node"><b>${esc(node.name)}</b><p>${esc(node.desc)}</p></div>`).join('')}
            </div>
            <div class="as-dual-gate" aria-hidden="true"><span>任一<br>成立</span></div>
            <div class="as-dual-core"><b>重要性议题</b><p>两项维度都不重要的议题，按第七条解释不披露的理由</p></div>
            <div class="as-dual-gate as-dual-arrow" aria-hidden="true">→</div>
            <div class="as-dual-right">
              <small>四要素披露框架 · 《指引》第十二条</small>
              <div class="as-dual-four">${fourElements.map(name => `<div>${esc(name)}</div>`).join('')}</div>
            </div>
          </div>
          <div class="mh-pillar-jump">${pillarJump}</div>
          <p class="mh-usage-note">判定依据出自《指引》第五条，披露框架出自第十二条；判断方法与披露方式见「双重重要性评估」与「整体框架结构」。</p>
        </section>

        <section class="mp-section" id="methods">
          <div class="mp-section-head"><div class="mp-section-title"><span>02</span><h2>方法拆解</h2></div><p>框架、重要性、编制流程与治理机制分别拆解</p></div>
          <div class="mh-module-grid cols-4">${moduleCards}</div>
        </section>

        <section class="mp-section" id="topics">
          <div class="mp-section-head"><div class="mp-section-title"><span>03</span><h2>披露议题目录</h2></div><p>按章节与主题定位披露要求，卡片标注对应条款</p></div>
          <div class="mh-pillar-stack">${pillars}</div>
        </section>

        <section class="mp-section" id="sources">
          <div class="mp-section-head"><div class="mp-section-title"><span>04</span><h2>版本与来源</h2></div><p>按发布机构与效力分层，核心文件为披露的强制依据</p></div>
          <div class="as-arch">${archNodes}</div>
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
