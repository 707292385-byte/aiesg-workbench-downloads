(function () {
  'use strict';

  const structures = {
    ashare: ['沪 · 深 · 北交易所版本', '披露四要素', '环境 · 社会 · 治理议题', '对应条款与证据'],
    hkex: ['ESG报告守则与气候规定', '披露模块', 'KPI与气候主题', '对应规则与指引'],
    csa: ['行业特定问卷', '治理 · 环境 · 社会维度', '可持续发展标准', '评估问题与依据']
  };
  const labels = {
    ashare: { short: 'A股', type: '交易所披露规则', group: '披露主题' },
    hkex: { short: '港交所', type: 'ESG披露体系', group: '知识模块' },
    csa: { short: 'CSA', type: '企业可持续发展评估', group: '评估标准' }
  };
  const clip = (value, limit = 105) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  };
  const number = value => String(value).padStart(2, '0');

  window.renderStructuredStandardV2 = function ({ standard, esc, href }) {
    const id = standard.id;
    if (!structures[id]) throw new Error('未找到这个知识体系目录');
    const structure = structures[id], label = labels[id], groups = standard.groups || [];
    const topicCount = groups.reduce((sum, group) => sum + (group.items || []).length, 0);
    const goals = (standard.goals || []).slice(0, 4);
    const topicCards = groups.map((group, index) => `
      <section class="mh-pillar mp-card structured-group" id="group-${index}">
        <header><div><small>${number(index + 1)} · ${esc(label.group)}</small><h3>${esc(group.title)}</h3></div><strong>${(group.items || []).length} 个主题</strong></header>
        <div class="mh-theme"><div class="mh-topic-grid">${(group.items || []).map(item => `
          <a class="mh-topic-card" href="${href('topic.html', { standard: id, id: item.id })}">
            <small>${esc(item.eyebrow || label.type)}</small><h4>${esc(item.title)}</h4><p>${esc(clip(item.summary))}</p>
            <div><span>知识要点</span><b>查看主题 →</b></div>
          </a>`).join('')}</div></div>
      </section>`).join('');

    return `<div class="msci-hub-page structured-standard-page" data-system="${id}">
      <header class="mp-topbar"><div class="mp-topbar-inner"><a class="mp-brand" href="${href('index.html')}"><span>${esc(label.short.slice(0, 1))}</span>${esc(label.short)} 知识体系</a><nav><a href="#overview">结构</a><a href="#focus">阅读重点</a><a href="#topics">主题目录</a><a href="#sources">来源</a></nav></div></header>
      <section class="mh-hero"><div class="mh-hero-inner"><div class="mh-crumb"><a href="${href('index.html')}">知识学堂</a><span>/</span>${esc(standard.title)}</div>
        <div class="mh-hero-grid"><div><span class="mp-eyebrow">${esc(label.type)} · 知识关系目录</span><h1>${esc(standard.title)}</h1><p>${esc(standard.description)}</p><div class="mp-hero-tags"><span>${esc(standard.issuer || '')}</span><span>框架关系</span><span>主题索引</span></div></div>
          <div class="mp-hero-side"><article><small>结构层级</small><strong>${structure.length}</strong></article><article><small>知识分组</small><strong>${groups.length}</strong></article><article><small>主题节点</small><strong>${topicCount}</strong></article><article><small>内容状态</small><strong class="structured-stage">目录整理中</strong></article></div>
        </div></div></section>
      <main class="mh-page"><a class="mh-back" href="${href('index.html')}">← 返回知识学堂</a>
        <section class="mp-section" id="overview"><div class="mp-section-head"><div class="mp-section-title"><span>01</span><h2>知识关系</h2></div><p>先看层级，再进入对应主题和资料依据</p></div>
          <div class="structured-flow" aria-label="${esc(structure.join('，然后'))}">${structure.map((step, index) => `<div><small>${number(index + 1)}</small><strong>${esc(step)}</strong></div>${index < structure.length - 1 ? '<i aria-hidden="true">→</i>' : ''}`).join('')}</div>
          <div class="structured-jump">${groups.slice(0, 4).map((group, index) => `<a href="#group-${index}">${esc(group.title)}<span>↓</span></a>`).join('')}</div>
        </section>
        <section class="mp-section" id="focus"><div class="mp-section-head"><div class="mp-section-title"><span>02</span><h2>阅读重点</h2></div><p>先理解关键判断，再回到对应主题和来源资料</p></div>
          <div class="structured-focus">${goals.map((goal, index) => `<article class="mp-card"><small>${number(index + 1)} · 关注点</small><p>${esc(goal)}</p></article>`).join('')}</div></section>
        <section class="mp-section" id="topics"><div class="mp-section-head"><div class="mp-section-title"><span>03</span><h2>主题目录</h2></div><p>按主题查看知识要点、判断路径和对应来源</p></div><div class="mh-pillar-stack">${topicCards}</div></section>
        <section class="mp-section" id="sources"><div class="mp-section-head"><div class="mp-section-title"><span>04</span><h2>来源与使用边界</h2></div><p>核对发布机构现行资料</p></div><div class="mh-source mh-source-pair mp-card"><div><small>当前参考</small><p>${esc(standard.sourceNote || '来源信息整理中')}</p></div><div><small>阅读说明</small><p>${esc(standard.notice || '本页为知识关系与目录摘要，正式工作请核对官方原文。')}</p></div></div></section>
      </main><footer class="mp-footer"><div><span>AI × ESG 工作台 · 知识关系与主题目录</span><span>正式工作请核对发布机构现行资料</span></div></footer>
    </div>`;
  };
})();
