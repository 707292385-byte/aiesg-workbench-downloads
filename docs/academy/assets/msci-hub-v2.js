(function () {
  const clip = (value, limit = 96) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  };

  const number = value => String(value).padStart(2, '0');

  function topbar(homeUrl, links) {
    return `<header class="mp-topbar"><div class="mp-topbar-inner">
      <a class="mp-brand" href="${homeUrl}"><span>M</span>MSCI 方法论解读</a>
      <nav>${links.map(([href, label]) => `<a href="${href}">${label}</a>`).join('')}</nav>
    </div></header>`;
  }

  function footer() {
    return `<footer class="mp-footer"><div><span>AI × ESG 工作台 · 方法论拆解与知识关联</span><span>正式内容以发布机构现行文件为准</span></div></footer>`;
  }

  function sectionHead(index, title, description) {
    return `<div class="mp-section-head"><div class="mp-section-title"><span>${number(index)}</span><h2>${title}</h2></div><p>${description}</p></div>`;
  }

  function groupTopics(items) {
    const result = [];
    items.forEach(item => {
      const key = item.eyebrow || '其他议题';
      let group = result.find(entry => entry.title === key);
      if (!group) {
        group = { title: key, items: [] };
        result.push(group);
      }
      group.items.push(item);
    });
    return result;
  }

  function standardHero(standard, issueCount, homeUrl, esc) {
    return `<section class="mh-hero"><div class="mh-hero-inner">
      <div class="mh-crumb"><a href="${homeUrl}">知识学堂</a><span>/</span>MSCI ESG评级方法论</div>
      <div class="mh-hero-grid"><div>
        <span class="mp-eyebrow">${esc(standard.eyebrow || 'ESG评级方法论')} · METHODOLOGY</span>
        <h1>${esc(standard.title)}</h1><p>${esc(standard.description)}</p>
        <div class="mp-hero-tags">${[standard.issuer, standard.version && `版本 ${standard.version}`, '方法论拆解', '知识关联'].filter(Boolean).map(value => `<span>${esc(value)}</span>`).join('')}</div>
      </div><div class="mp-hero-side">
        <article><small>关键议题</small><strong>${issueCount}</strong></article>
        <article><small>评级支柱</small><strong>${standard.groups.length}</strong></article>
        <article><small>方法模块</small><strong>${standard.modules?.length || 0}</strong></article>
        <article><small>内容版本</small><strong>${esc(standard.version || '—')}</strong></article>
      </div></div>
    </div></section>`;
  }

  window.renderMsciStandardV2 = function (api) {
    const { standard, esc, href } = api;
    const issueCount = standard.groups.reduce((sum, group) => sum + group.items.length, 0);
    const pillarOrder = { 环境支柱: 0, 社会支柱: 1, 治理支柱: 2 };
    const displayGroups = [...standard.groups].sort((left, right) => (pillarOrder[left.title] ?? 9) - (pillarOrder[right.title] ?? 9));
    const homeUrl = href('index.html');
    const moduleCards = (standard.modules || []).map((module, index) => `
      <a class="mh-module-card mp-card" href="${href('module.html', { standard: standard.id, id: module.id })}">
        <span class="mh-card-number">${number(index + 1)}</span><small>方法论模块</small>
        <h3>${esc(module.title)}</h3><p>${esc(module.description)}</p>
        <div><b>${esc(module.count || '')}</b><span>查看完整拆解 →</span></div>
      </a>`).join('');
    const pillars = displayGroups.map((group, groupIndex) => `
      <section class="mh-pillar mp-card" id="pillar-${groupIndex}" data-pillar="${groupIndex}">
        <header><div><small>${number(groupIndex + 1)} · ${esc(group.titleEn || 'PILLAR')}</small><h3>${esc(group.title)}</h3></div><strong>${group.items.length} 个议题</strong></header>
        ${groupTopics(group.items).map(theme => `<div class="mh-theme"><div class="mh-theme-title"><h4>${esc(theme.title)}</h4><span>${theme.items.length}</span></div><div class="mh-topic-grid">${theme.items.map(item => `
          <a class="mh-topic-card" href="${href('topic.html', { standard: standard.id, id: item.id })}">
            <small>${esc(item.titleEn || '')}</small><h4>${esc(item.title)}</h4><p>${esc(clip(item.summary, 88))}</p>
            <div>${(item.tags || []).slice(0, 2).map(tag => `<span>${esc(tag)}</span>`).join('')}<b>查看解读 →</b></div>
          </a>`).join('')}</div></div>`).join('')}
      </section>`).join('');
    const pillarLinks = displayGroups.map((group, index) => [`#pillar-${index}`, group.title.replace('支柱', '')]);
    return `<div class="msci-hub-page">
      ${topbar(homeUrl, [['#overview', '总览'], ['#modules', '核心拆解'], ['#topics', '议题目录'], ['#sources', '来源']])}
      ${standardHero(standard, issueCount, homeUrl, esc)}
      <main class="mh-page">
        <a class="mh-back" href="${homeUrl}">← 返回知识学堂</a>
        <section class="mp-section" id="overview">${sectionHead(1, '方法结构', '这里是结构说明；下方带箭头的入口可以进入详细页面')}
          <div class="mh-structure" aria-label="MSCI 方法结构：公司风险与机遇经支柱、主题和关键议题评价后汇总评级">
            <span>公司 ESG 风险与机遇</span><i aria-hidden="true">→</i><span>环境 · 社会 · 治理</span><i aria-hidden="true">→</i><span>主题与关键议题</span><i aria-hidden="true">→</i><span>汇总评级</span>
          </div>
          <div class="mh-pillar-jump">${pillarLinks.map(([target, label]) => `<a href="${target}">${esc(label)}<span>→</span></a>`).join('')}</div>
        </section>
        <section class="mp-section" id="modules">${sectionHead(2, '核心方法论拆解', '总览、流程和行业权重分别查看')}
          <div class="mh-module-grid">${moduleCards}</div>
        </section>
        <section class="mp-section" id="topics">${sectionHead(3, '关键议题目录', '按支柱与主题找到具体评价方法')}
          <div class="mh-pillar-stack">${pillars}</div>
        </section>
        <section class="mp-section" id="sources">${sectionHead(4, '版本与来源', '方法论更新时回到官网核对')}
          <div class="mh-source mp-card"><div><small>页面内容版本</small><strong>${esc(standard.version || '—')}</strong></div><p>依据 MSCI ESG Ratings Methodology（2026 年 3 月）和模型历史资料（2026 年 6 月）整理。后续方法论可能更新。</p><p>中文用于辅助阅读；正式使用请核对 MSCI 官网现行文件。</p></div>
        </section>
      </main>${footer()}
    </div>`;
  };

  const overviewChapters = [
    ['目标与定位', 0, 2],
    ['数据、评级与权重', 2, 11],
    ['关键议题评估与治理', 11, 50],
    ['最终评级与限制', 50, 58],
    ['补充披露与附录', 58, 67],
    ['模型更新记录', 67, 96],
    ['区域与机构说明', 96, 100],
  ];
  const processChapters = [
    ['数据获取与映射', 0, 10],
    ['质量保证', 10, 12],
    ['发行人沟通', 12, 13],
    ['覆盖与公司行动', 13, 23],
    ['方法论治理', 23, 26],
  ];
  const processStageNotes = [
    ['输入', 'ESG 数据与实体资料', '核对', '数据来源、实体选择与映射', '形成', '可用于评分的数据基础'],
    ['输入', '已获取与已映射的数据', '核对', '评级质量审核步骤', '形成', '经审核的评级输入'],
    ['输入', '与发行人有关的信息', '核对', '发行人沟通与反馈', '形成', '需记录和更新的解释'],
    ['输入', '覆盖范围与公司变化', '核对', '新增、移除、拆分、并购及 GICS 变更', '形成', '更新后的覆盖和实体关系'],
    ['输入', '方法论及年度磋商', '核对', '治理和特殊变更流程', '形成', '下一轮方法论维护依据'],
  ];

  function narrativeModule(api) {
    const { detail, standard, id, esc, href, rich, bilingual } = api;
    const chapters = (id === 'overview' ? overviewChapters : processChapters)
      .map(([title, start, end]) => ({ title, start, end: Math.min(end, detail.sections.length), sections: detail.sections.slice(start, end) }))
      .filter(chapter => chapter.sections.length);
    const backUrl = href('standard.html', { id: 'msci' });
    const summary = id === 'overview'
      ? '从评级定位、关键议题评估、权重计算到最终评级，按关系理解完整方法。'
      : '从数据获取、分析审核、发行人沟通到方法论治理，查看评级如何形成和更新。';
    return `<div class="msci-hub-page">
      ${topbar(backUrl, [['#overview', '内容结构'], ...chapters.slice(0, 4).map((chapter, index) => [`#chapter-${index}`, chapter.title]), ['#sources', '来源']])}
      <section class="mh-hero"><div class="mh-hero-inner"><div class="mh-crumb"><a href="${href('index.html')}">知识学堂</a><span>/</span><a href="${backUrl}">MSCI评级方法论</a><span>/</span>${esc(detail.title)}</div>
        <div class="mh-hero-grid"><div><span class="mp-eyebrow">${id === 'overview' ? '方法论总览' : '评级流程'} · MSCI ESG RATINGS</span><h1>${esc(detail.title)}</h1><p>${esc(summary)}</p><div class="mp-hero-tags"><span>${detail.sections.length} 节完整内容</span><span>结构化解读</span><span>中英对照</span></div></div>
        <div class="mp-hero-side"><article><small>内容章节</small><strong>${detail.sections.length}</strong></article><article><small>结构分组</small><strong>${chapters.length}</strong></article><article><small>内容版本</small><strong>${esc(standard.version || '—')}</strong></article><article><small>呈现方式</small><strong>卡片</strong></article></div></div>
      </div></section>
      <main class="mh-page"><a class="mh-back" href="${backUrl}">← 返回 MSCI 方法论</a>
        <section class="mp-section" id="overview">${sectionHead(1, id === 'process' ? '评级是怎样形成的' : '内容结构', id === 'process' ? '沿步骤向下看，点击阶段名称可跳到对应内容' : '选择章节入口，跳到对应完整内容')}
          ${id === 'process' ? `<div class="mh-process-flow">${chapters.map((chapter, index) => `<a href="#chapter-${index}"><small>阶段 ${number(index + 1)}</small><strong>${esc(chapter.title)}</strong><span>${chapter.sections.length} 节 · 查看内容 ↓</span></a>`).join('<i aria-hidden="true">→</i>')}</div><p class="mh-process-note">数据与实体先确定评价对象，质量审核和发行人沟通核对结果；公司及行业分类变化会触发更新，方法论治理负责长期调整。</p>` : `<div class="mh-chapter-map">${chapters.map((chapter, index) => `<a class="mp-card" href="#chapter-${index}"><span>${number(index + 1)}</span><h3>${esc(chapter.title)}</h3><p>${chapter.sections.length} 个章节 · 跳转 ↓</p></a>`).join('')}</div>`}
        </section>
        ${chapters.map((chapter, chapterIndex) => `<section class="mp-section mh-chapter" id="chapter-${chapterIndex}">${sectionHead(chapterIndex + 2, esc(chapter.title), `${chapter.sections.length} 个章节，按需展开阅读`)}
          ${id === 'process' ? `<div class="mh-stage-detail">${[0, 2, 4].map(position => `<div><small>${processStageNotes[chapterIndex][position]}</small><strong>${processStageNotes[chapterIndex][position + 1]}</strong></div>`).join('<i aria-hidden="true">→</i>')}</div>` : ''}
          <div class="mh-accordion">${chapter.sections.map((section, offset) => {
            const sectionIndex = chapter.start + offset;
            const chinese = `<div class="cn-content-body">${rich(section.content_cn || section.content || '')}</div>`;
            return `<details class="mp-card" id="module-${sectionIndex}" ${chapterIndex === 0 && offset === 0 ? 'open' : ''}><summary><span>${number(sectionIndex + 1)}</span><strong>${esc(section.title || `第${sectionIndex + 1}节`)}</strong></summary><div class="mh-accordion-body">${bilingual(chinese, section.content_en || '')}</div></details>`;
          }).join('')}</div>
        </section>`).join('')}
        <section class="mp-section" id="sources">${sectionHead(chapters.length + 2, '版本与参考', '方法论更新时核对现行原件')}
          <div class="mh-source mh-source-pair mp-card"><div><small>参考资料</small><p>依据 MSCI ${id === 'process' ? 'ESG Ratings Process' : 'ESG Ratings Methodology'}（2026 年 3 月）整理。方法论及流程可能调整，请核对 MSCI 官网现行文件。</p></div><div><small>阅读说明</small><p>中文为辅助翻译，段落后的 EN 可查看对应英文。</p></div></div>
        </section>
      </main>${footer()}
    </div>`;
  }

  function materialityModule(api) {
    const { detail, standard, esc, href } = api;
    const backUrl = href('standard.html', { id: 'msci' });
    const sectors = detail.rows.filter(row => row.level === 'Sector').length;
    const subIndustries = detail.rows.filter(row => row.level === 'Sub-industry').length;
    return `<div class="msci-hub-page">
      ${topbar(backUrl, [['#overview', '映射说明'], ['#map', '权重矩阵'], ['#sources', '来源']])}
      <section class="mh-hero"><div class="mh-hero-inner"><div class="mh-crumb"><a href="${href('index.html')}">知识学堂</a><span>/</span><a href="${backUrl}">MSCI评级方法论</a><span>/</span>${esc(detail.title)}</div>
        <div class="mh-hero-grid"><div><span class="mp-eyebrow">行业权重映射 · MATERIALITY MAP</span><h1>${esc(detail.title)}</h1><p>按 GICS 板块与子行业查看关键议题权重，识别不同行业的重点风险与机会。</p><div class="mp-hero-tags"><span>行业筛选</span><span>权重热力</span><span>关键议题关联</span></div></div>
        <div class="mp-hero-side"><article><small>GICS板块</small><strong>${sectors}</strong></article><article><small>子行业</small><strong>${subIndustries}</strong></article><article><small>权重字段</small><strong>${detail.issues.length}</strong></article><article><small>数据行</small><strong>${detail.rows.length}</strong></article></div></div>
      </div></section>
      <main class="mh-page"><a class="mh-back" href="${backUrl}">← 返回 MSCI 方法论</a>
        <section class="mp-section" id="overview">${sectionHead(1, '如何使用权重映射', 'GICS 板块包含子行业；先定位板块，再查看子行业权重')}
          <div class="mh-hierarchy-guide"><div><small>层级 1 · 两位代码</small><strong>板块</strong><span>先看一类行业的整体概览</span></div><i aria-hidden="true">→ 包含 →</i><div><small>层级 2 · 八位代码</small><strong>子行业</strong><span>在该板块下核对具体业务</span></div><i aria-hidden="true">→ 对照 →</i><div><small>评价字段</small><strong>关键议题权重</strong><span>颜色深浅用于快速识别高权重</span></div></div>
          <p class="mh-usage-note"><strong>使用说明：</strong>此表用于理解行业与议题的关系。权重可能随 MSCI 方法论更新，正式工作以现行资料为准。</p>
        </section>
        <section class="mp-section" id="map">${sectionHead(2, '行业权重矩阵', '支持搜索、层级筛选与横向滚动')}
          <div class="mh-materiality mp-card"><div class="materiality-toolbar"><label>选择板块<select id="industry-sector">${detail.rows.filter(row => row.level === 'Sector').map(row => `<option value="${esc(row.gics_code)}">${esc(row.industry_cn || row.industry)} · ${esc(row.gics_code)}</option>`).join('')}</select></label><label>显示层级<select id="industry-level"><option value="all">板块与子行业</option><option value="Sector">仅板块</option><option value="Sub-industry">仅子行业</option></select></label><label>查找<input id="industry-search" type="search" placeholder="名称或 GICS 编码"></label><span id="industry-count"></span></div><p id="industry-path" class="mh-industry-path"></p><div id="materiality-table"></div></div>
        </section>
        <section class="mp-section" id="sources">${sectionHead(3, '版本与参考', '权重更新时重新核对映射数据')}
          <div class="mh-source mh-source-pair mp-card"><div><small>数据来源</small><p>MSCI 官网行业权重资料；行业层级按 GICS 板块与子行业呈现。</p></div><div><small>更新提醒</small><p>行业分类和议题权重可能更新，实际使用前请核对 MSCI 现行资料。</p></div></div>
        </section>
      </main>${footer()}
    </div>`;
  }

  window.renderMsciModuleV2 = function (api) {
    return api.id === 'materiality' ? materialityModule(api) : narrativeModule(api);
  };

  window.bindMsciHubV2 = function (root) {
    root.querySelectorAll('.mh-accordion').forEach(list => {
      list.addEventListener('click', event => {
        const summary = event.target.closest('summary');
        const opened = summary?.parentElement;
        if (!(opened instanceof HTMLDetailsElement) || opened.open) return;
        list.querySelectorAll(':scope > details[open]').forEach(item => {
          if (item !== opened) item.open = false;
        });
      });
    });
  };
})();
