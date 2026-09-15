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
        <section class="mp-section" id="overview">${sectionHead(1, '方法论导航', '先理解评级结构，再按支柱进入具体议题')}
          <div class="mp-overview-grid">
            <article class="mp-metric mp-card"><small>评级对象</small><strong>公司 ESG 风险与机遇</strong><span>关注财务相关性及管理能力</span></article>
            <article class="mp-metric mp-card"><small>评价结构</small><strong>支柱 · 主题 · 议题</strong><span>从关键议题汇总到最终评级</span></article>
            <article class="mp-metric mp-card"><small>内容范围</small><strong>${issueCount} 个关键议题</strong><span>环境、社会与治理三个支柱</span></article>
            <article class="mp-metric mp-card"><small>使用方式</small><strong>拆解 · 关联 · 核对</strong><span>用于理解方法，正式工作回到原件</span></article>
          </div>
          <div class="mh-pillar-jump">${pillarLinks.map(([target, label]) => `<a href="${target}">${esc(label)}<span>→</span></a>`).join('')}</div>
        </section>
        <section class="mp-section" id="modules">${sectionHead(2, '核心方法论拆解', '总览、流程和行业权重分别查看')}
          <div class="mh-module-grid">${moduleCards}</div>
        </section>
        <section class="mp-section" id="topics">${sectionHead(3, '关键议题目录', '按支柱与主题找到具体评价方法')}
          <div class="mh-pillar-stack">${pillars}</div>
        </section>
        <section class="mp-section" id="sources">${sectionHead(4, '版本与来源', '内容更新时保留核对依据')}
          <div class="mh-source mp-card"><div><small>当前版本</small><strong>${esc(standard.version || '—')}</strong></div><p>${esc(standard.sourceNote || '')}</p><p>${esc(standard.notice || '')}</p></div>
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
        <section class="mp-section" id="overview">${sectionHead(1, '内容结构', '从整体关系进入完整章节')}
          <div class="mh-chapter-map">${chapters.map((chapter, index) => `<a class="mp-card" href="#chapter-${index}"><span>${number(index + 1)}</span><h3>${esc(chapter.title)}</h3><p>${chapter.sections.length} 个章节</p></a>`).join('')}</div>
        </section>
        ${chapters.map((chapter, chapterIndex) => `<section class="mp-section mh-chapter" id="chapter-${chapterIndex}">${sectionHead(chapterIndex + 2, esc(chapter.title), `${chapter.sections.length} 个章节，按需展开阅读`)}
          <div class="mh-accordion">${chapter.sections.map((section, offset) => {
            const sectionIndex = chapter.start + offset;
            const chinese = `<div class="cn-content-body">${rich(section.content_cn || section.content || '')}</div>`;
            return `<details class="mp-card" id="module-${sectionIndex}" ${chapterIndex === 0 && offset === 0 ? 'open' : ''}><summary><span>${number(sectionIndex + 1)}</span><strong>${esc(section.title || `第${sectionIndex + 1}节`)}</strong></summary><div class="mh-accordion-body">${bilingual(chinese, section.content_en || '')}</div></details>`;
          }).join('')}</div>
        </section>`).join('')}
        <section class="mp-section" id="sources">${sectionHead(chapters.length + 2, '来源与语言说明', '正式使用前核对现行原件')}
          <div class="mh-source mp-card"><p>${esc(detail.sourceNote || '')}</p><p>${esc(detail.languageAlignmentNote || '')}</p></div>
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
        <section class="mp-section" id="overview">${sectionHead(1, '如何使用权重映射', '先选行业层级，再横向比较关键议题')}
          <div class="mp-overview-grid"><article class="mp-metric mp-card"><small>第一步</small><strong>选择行业层级</strong><span>板块适合概览，子行业适合具体核对</span></article><article class="mp-metric mp-card"><small>第二步</small><strong>搜索行业</strong><span>输入中文、英文或 GICS 编码</span></article><article class="mp-metric mp-card"><small>第三步</small><strong>识别高权重</strong><span>颜色越深，议题相对权重越高</span></article><article class="mp-metric mp-card"><small>使用边界</small><strong>用于理解与定位</strong><span>具体工作以现行方法论数据为准</span></article></div>
        </section>
        <section class="mp-section" id="map">${sectionHead(2, '行业权重矩阵', '支持搜索、层级筛选与横向滚动')}
          <div class="mh-materiality mp-card"><div class="materiality-toolbar"><input id="industry-search" type="search" placeholder="搜索行业名称或 GICS 编码"><select id="industry-level"><option value="Sector">先看板块</option><option value="Sub-industry">查看全部子行业</option><option value="all">板块与子行业</option></select><span id="industry-count"></span></div><div id="materiality-table"></div></div>
        </section>
        <section class="mp-section" id="sources">${sectionHead(3, '来源与说明', '权重更新时重新核对映射数据')}
          <div class="mh-source mp-card"><p>${esc(detail.sourceNote || '')}</p></div>
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
