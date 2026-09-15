(function () {
  const cleanTitle = section => String(section?.title_cn || section?.title_en || '')
    .replace(/^[•◦■]\s*/, '')
    .trim();

  const firstText = section => {
    const block = (section?.blocks || []).find(item => item.type !== 'formula');
    return String(block?.content_cn || block?.content || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const short = (value, limit = 180) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  };

  const blockCount = sections => sections.reduce(
    (total, section) => total + (section.blocks || []).length,
    0,
  );

  const sectionNumber = value => String(value).padStart(2, '0');

  const scoreParts = sections => {
    const find = pattern => sections.findIndex(section => pattern.test(cleanTitle(section)));
    return {
      rootIndex: find(/关键议题得分|总得分|最终得分/),
      exposureIndex: find(/敞口得分$/),
      managementIndex: find(/管理得分$/),
    };
  };

  function sectionBody(section, index, renderBlock) {
    return (section.blocks || [])
      .map((block, blockIndex) => renderBlock(block, `mp-${index}-${blockIndex}`))
      .join('');
  }

  function coreContent(sections, groups, sourceIndices, renderBlock, esc) {
    const grouped = new Set(groups.flatMap(group => [group.parent, ...group.children]));
    const sources = new Set(sourceIndices);
    const scorePattern = /得分|其中[：:]?$|业务敞口|地理敞口/;
    const core = sections
      .map((section, index) => ({ section, index }))
      .filter(item => !grouped.has(item.index) && !sources.has(item.index));
    const featured = core.filter(item => !scorePattern.test(cleanTitle(item.section)));
    const technical = core.filter(item => scorePattern.test(cleanTitle(item.section)));
    const cards = featured.map((item, order) => `
      <details class="mp-card mp-accordion-item" ${order === 0 ? 'open' : ''} id="section-${item.index}">
        <summary>${esc(cleanTitle(item.section))}<small>${(item.section.blocks || []).length} 个内容块</small></summary>
        <div class="mp-accordion-body">${sectionBody(item.section, item.index, renderBlock)}</div>
      </details>`).join('');
    const technicalCard = technical.length ? `
      <details class="mp-card mp-accordion-item mp-technical-bundle">
        <summary>完整评分与敞口说明<small>${technical.length} 个章节</small></summary>
        <div class="mp-accordion-body mp-technical-body">
          ${technical.map(item => `<section id="section-${item.index}"><h3>${esc(cleanTitle(item.section))}</h3>${sectionBody(item.section, item.index, renderBlock)}</section>`).join('')}
        </div>
      </details>` : '';
    return `${cards}${technicalCard}`;
  }

  function scoreSection(sections, renderLatex, esc, number, parts) {
    const { rootIndex, exposureIndex, managementIndex } = parts;
    if (rootIndex < 0) return '';
    const root = sections[rootIndex];
    const formula = (root.blocks || []).find(block => block.type === 'formula');
    const hasBranches = exposureIndex >= 0 && managementIndex >= 0;
    return `
      <section class="mp-section" id="score">
        <div class="mp-section-head"><div class="mp-section-title"><span>${sectionNumber(number)}</span><h2>评分结构</h2></div><p>${hasBranches ? '关键议题得分由风险敞口和管理能力共同决定' : '按该治理议题适用的方法形成关键议题得分'}</p></div>
        <div class="mp-score-shell mp-card">
          <div class="mp-score-lead">
            <article class="mp-score-root"><small>最终结果 · KEY ISSUE SCORE</small><h3>${esc(cleanTitle(root))}</h3><p>${esc(short(firstText(root), 220))}</p></article>
            <div class="mp-score-equation"><small>${formula ? '核心计算关系' : '评分说明'}</small>${formula ? renderLatex(formula.content) : esc(short(firstText(root), 260))}</div>
          </div>
          ${hasBranches ? `<div class="mp-score-branches">
            <article class="mp-branch exposure mp-card"><small>01 · 风险有多大</small><h3>${esc(cleanTitle(sections[exposureIndex]))}</h3><p>${esc(short(firstText(sections[exposureIndex]), 150))}</p><div class="mp-branch-tags"><span>业务敞口</span><span>地理敞口</span><span>风险压力</span></div></article>
            <article class="mp-branch management mp-card"><small>02 · 应对得怎样</small><h3>${esc(cleanTitle(sections[managementIndex]))}</h3><p>${esc(short(firstText(sections[managementIndex]), 150))}</p><div class="mp-branch-tags"><span>政策</span><span>措施</span><span>目标</span><span>绩效</span></div></article>
          </div>` : ''}
        </div>
      </section>`;
  }

  function riskSection(sections, esc, number) {
    const risk = sections.find(section => /相关的风险/.test(cleanTitle(section)));
    if (!risk) return '';
    const risks = (risk.blocks || []).map(block => firstText({ blocks: [block] })).filter(Boolean);
    return `
      <section class="mp-section" id="risks">
        <div class="mp-section-head"><div class="mp-section-title"><span>${sectionNumber(number)}</span><h2>风险与应对关系</h2></div><p>风险来源、业务影响与管理响应放在同一视图</p></div>
        <div class="mp-risk-grid">
          <article class="mp-risk-card mp-card"><small>风险来源</small><h3>监管与市场成本变化</h3><p>${esc(short(risks[0] || firstText(risk), 180))}</p></article>
          <article class="mp-risk-card mp-card"><small>业务影响</small><h3>投入、运营与竞争压力</h3><p>${esc(short(risks[1] || risks[0] || firstText(risk), 180))}</p></article>
          <article class="mp-risk-card mp-card"><small>管理响应</small><h3>措施、目标与绩效验证</h3><p>通过政策、执行措施、量化目标和绩效结果说明公司如何管理这一关键议题。</p></article>
        </div>
      </section>`;
  }

  function frameworkSection(sections, groups, esc, number) {
    if (!groups.length) return '';
    return `
      <section class="mp-section" id="framework">
        <div class="mp-section-head"><div class="mp-section-title"><span>${sectionNumber(number)}</span><h2>管理评分框架</h2></div><p>先看父级维度，再进入各项指标定义</p></div>
        <div class="mp-framework mp-card">
          <div class="mp-framework-flow">${groups.slice(0, 3).map((group, index) => `
            <article class="mp-framework-card"><span class="mp-num">0${index + 1}</span><h3>${esc(cleanTitle(sections[group.parent]))}</h3><p>${esc(short(firstText(sections[group.parent]), 150))}</p><div class="mp-pill-list">${group.children.slice(0, 6).map(child => `<span>${esc(cleanTitle(sections[child]))}</span>`).join('')}</div></article>`).join('')}
          </div>
          <div class="mp-framework-note"><strong>各指标得分按适用权重汇总，并结合争议事件等因素调整</strong><span>具体计算与变量说明见下方完整内容</span></div>
        </div>
      </section>`;
  }

  function formulaSection(sections, renderLatex, renderBlock, esc, number) {
    const items = sections
      .map((section, index) => ({ section, index, formula: (section.blocks || []).find(block => block.type === 'formula') }))
      .filter(item => item.formula)
      .slice(0, 6);
    if (!items.length) return '';
    return `
      <section class="mp-section" id="formulas">
        <div class="mp-section-head"><div class="mp-section-title"><span>${sectionNumber(number)}</span><h2>关键计算方法</h2></div><p>先看计算关系，完整变量说明保留在核心内容中</p></div>
        <div class="mp-formula-grid">${items.map(item => `
          <article class="mp-formula-card mp-card"><header><h3>${esc(cleanTitle(item.section))}</h3><span>计算关系</span></header><div class="mp-formula">${renderLatex(item.formula.content)}</div><p>${esc(short(firstText(item.section), 190))}</p>${(() => {
            const blocks = item.section.blocks || [];
            const formulaIndex = blocks.indexOf(item.formula);
            const explanation = blocks.slice(formulaIndex + 1).filter(block => ['text', 'list'].includes(block.type) && !/^(其中[：:]?\s*)?$/.test(String(block.content_cn || '').trim())).slice(0, 5);
            return explanation.length ? `<details class="mp-formula-legend"><summary>查看符号与变量说明</summary><div>${explanation.map((block, index) => renderBlock(block, `formula-note-${item.index}-${index}`)).join('')}</div></details>` : '';
          })()}</article>`).join('')}
        </div>
      </section>`;
  }

  function indicatorSection(sections, groups, renderBlock, esc, number) {
    if (!groups.length) return '';
    return `
      <section class="mp-section" id="indicators">
        <div class="mp-section-head"><div class="mp-section-title"><span>${sectionNumber(number)}</span><h2>指标体系与定义</h2></div><p>父级维度说明 + 指标卡片，按需展开详细定义</p></div>
        <div class="mp-indicator-groups">${groups.map((group, groupIndex) => {
          const parent = sections[group.parent];
          return `<section class="mp-indicator-group mp-card" id="section-${group.parent}">
            <div class="mp-group-head"><div><small>0${groupIndex + 1} · 管理维度</small><h3>${esc(cleanTitle(parent))}</h3></div><p>${esc(short(firstText(parent), 230))}</p></div>
            <details class="mp-parent-detail"><summary>查看该维度的完整说明</summary><div>${sectionBody(parent, group.parent, renderBlock)}</div></details>
            <div class="mp-indicator-list">${group.children.map(index => `<details id="section-${index}"><summary>${esc(cleanTitle(sections[index]))}</summary><div class="mp-indicator-detail">${sectionBody(sections[index], index, renderBlock)}</div></details>`).join('')}</div>
          </section>`;
        }).join('')}</div>
      </section>`;
  }

  function sourceSection(detail, sections, sourceIndices, renderBlock, esc, number) {
    const cards = sourceIndices.map(index => `<article class="mp-source-card mp-card" id="section-${index}"><h3>${esc(cleanTitle(sections[index]))}</h3>${sectionBody(sections[index], index, renderBlock)}</article>`).join('');
    return `
      <section class="mp-section" id="sources">
        <div class="mp-section-head"><div class="mp-section-title"><span>${sectionNumber(number)}</span><h2>来源与使用说明</h2></div><p>正式工作请回到发布机构现行文件核对</p></div>
        <div class="mp-source-grid">${cards}<article class="mp-source-card mp-card"><h3>版本与参考</h3><p>${esc(detail.titleEn || detail.title)}：参考 MSCI 官网 ${/June\s*2026/i.test(detail.sourceNote || '') ? '2026 年 6 月' : '2026 年 3 月'}资料。方法论可能更新，请以 MSCI 现行文件为准。</p></article></div>
        <p class="mp-translation-note">由AI翻译，仅供参考。段落后的 EN 可查看对应英文。</p>
      </section>`;
  }

  window.renderMsciTopicV2 = function (api) {
    const { detail, sections, groups, stats, sourceIndices, esc, renderBlock, renderLatex, href } = api;
    const homeUrl = href('index.html');
    const backUrl = href('standard.html', { id: 'msci' });
    const carbon = detail.id === 'MSCI-ENV-01';
    const score = scoreParts(sections);
    const hasScore = score.rootIndex >= 0;
    const hasRisk = sections.some(section => /相关的风险/.test(cleanTitle(section)));
    const hasFramework = groups.length > 0;
    const hasFormulas = stats.formulas > 0;
    const hasIndicators = groups.length > 0;
    const isExposureManagementModel = score.exposureIndex >= 0 && score.managementIndex >= 0;
    const overview = carbon ? [
      ['评价对象', '运营碳强度', '范围1、范围2及价值链影响'],
      ['风险判断', '敞口 × 管理', '风险越高，管理要求越高'],
      ['管理评价', '措施 · 目标 · 绩效', '指标加权后结合争议调整'],
      ['最终输出', '0—10 分', '形成关键议题得分'],
    ] : [
      ['所属支柱', detail.pillar || '—', 'MSCI ESG评级模型中的议题位置'],
      ['所属主题', detail.theme || '—', '用于识别主要风险或机遇'],
      ['评价类型', detail.type || '关键议题', isExposureManagementModel ? '结合风险敞口与管理表现' : '按该议题适用方法进行评价'],
      ['内容范围', `${sections.length} 节`, `${stats.indicators} 项指标 · ${stats.formulas} 个公式`],
    ];
    const nav = [['#overview', '概览']];
    if (hasScore) nav.push(['#score', '评分结构']);
    if (hasFramework) nav.push(['#framework', '管理框架']);
    if (hasIndicators) nav.push(['#indicators', '指标定义']);
    nav.push(['#sources', '来源']);

    let number = 3;
    const bodySections = [];
    if (hasScore) bodySections.push(scoreSection(sections, renderLatex, esc, number++, score));
    if (hasRisk) bodySections.push(riskSection(sections, esc, number++));
    if (hasFramework) bodySections.push(frameworkSection(sections, groups, esc, number++));
    if (hasFormulas) bodySections.push(formulaSection(sections, renderLatex, renderBlock, esc, number++));
    if (hasIndicators) bodySections.push(indicatorSection(sections, groups, renderBlock, esc, number++));
    bodySections.push(sourceSection(detail, sections, sourceIndices, renderBlock, esc, number));

    const fourthStat = hasFramework
      ? ['管理维度', groups.length]
      : ['核心章节', Math.max(0, sections.length - sourceIndices.length)];
    const readingNotice = hasFramework
      ? '阅读顺序：先看评分结构，再看管理框架，最后进入各指标定义与原文。'
      : '阅读顺序：先看议题概览与核心内容，再看评分说明和来源。';
    return `
      <div class="msci-prototype-page">
        <header class="mp-topbar"><div class="mp-topbar-inner"><a class="mp-brand" href="${backUrl}"><span>M</span>MSCI 方法论解读</a><nav>${nav.map(([target, label]) => `<a href="${target}">${label}</a>`).join('')}</nav></div></header>
        <section class="mp-hero" id="top"><div class="mp-hero-inner"><div class="mp-crumb"><a href="${homeUrl}">知识学堂</a>　/　<a href="${backUrl}">MSCI ESG评级方法论</a>　/　${esc(detail.title)}</div><div class="mp-hero-grid"><div><span class="mp-eyebrow">关键议题 · ${esc(detail.titleEn || '')}</span><h1>${esc(detail.title)}</h1><p>${esc(detail.summary || '')}</p><div class="mp-hero-tags">${[detail.pillar, detail.theme, detail.type, '完整方法论', '中英对照'].filter(Boolean).map(value => `<span>${esc(value)}</span>`).join('')}</div></div><div class="mp-hero-side"><article><small>内容章节</small><strong>${sections.length}</strong></article><article><small>内容块</small><strong>${blockCount(sections)}</strong></article><article><small>公式</small><strong>${stats.formulas}</strong></article><article><small>${fourthStat[0]}</small><strong>${fourthStat[1]}</strong></article></div></div></div></section>
        <div class="mp-page">
          <a class="mh-back" href="${backUrl}">← 返回 MSCI 方法论</a>
          <section class="mp-section" id="overview"><div class="mp-section-head"><div class="mp-section-title"><span>01</span><h2>议题概览</h2></div><p>先判断适用范围，再进入评分和指标</p></div><div class="mp-overview-grid">${overview.map(item => `<article class="mp-metric mp-card"><small>${esc(item[0])}</small><strong>${esc(item[1])}</strong><span>${esc(item[2])}</span></article>`).join('')}</div><div class="mp-notice">${readingNotice}</div></section>
          <section class="mp-section" id="core"><div class="mp-section-head"><div class="mp-section-title"><span>02</span><h2>核心内容</h2></div><p>折叠时便于扫描，展开后完整保留原始内容</p></div><div class="mp-accordion-stack">${coreContent(sections, groups, sourceIndices, renderBlock, esc)}</div></section>
          ${bodySections.join('')}
        </div>
        <footer class="mp-footer"><div><span>AI × ESG 工作台 · 方法论拆解与知识关联</span><span>正式内容以发布机构现行文件为准</span></div></footer>
      </div>`;
  };

  window.bindMsciTopicV2 = function (root) {
    root.querySelectorAll('.mp-accordion-stack,.mp-indicator-list').forEach(list => {
      list.addEventListener('click', event => {
        const summary = event.target.closest('summary');
        const opened = summary?.parentElement;
        if (!(opened instanceof HTMLDetailsElement) || opened.open) return;
        const siblings = opened.parentElement === list
          ? list.querySelectorAll(':scope > details[open]')
          : [];
        siblings.forEach(item => { if (item !== opened) item.open = false; });
      });
    });
  };
})();
