/* 标普全球CSA目录页：与 MSCI/A股/财政部/港交所目录页共用同一套 mp-/mh- 视觉体系。 */
(function () {
  'use strict';
  const number = value => String(value).padStart(2, '0');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const clip = (value, limit = 84) => { const text = clean(value); return text.length > limit ? `${text.slice(0, limit)}…` : text; };
  const pickNumber = text => { const match = clean(text).match(/(\d+(?:\.\d+)?)\s*个?问题/); return match ? Number(match[1]) : 0; };
  const pickWeight = text => { const match = clean(text).match(/([\d.]+)%/); return match ? Number(match[1]) : 0; };

  /* 评估流程七步（官方方法论口径），每步配一句落脚说明 */
  const STEP_NOTES = {
    '行业特定问卷设计': '行业决定问什么',
    '数据收集与证据审核': '证据先于陈述',
    '数据标准化': '同行业才可比',
    '问题级评分': '透明度与绩效都给分',
    '维度加权汇总': '权重自下而上',
    'MSA争议调整': '争议事件向下调整',
    '最终评分发布': '分数不跨行业比较',
  };

  window.renderCsaStandardV2 = function ({ standard, esc, href }) {
    const groups = standard.groups || [];
    const process = standard.process || [];
    const topicCount = groups.reduce((sum, group) => sum + group.items.length, 0);
    const homeUrl = href('index.html');
    const topicHref = id => href('topic.html', { standard: standard.id, id });

    const topbar = `<header class="mp-topbar"><div class="mp-topbar-inner">
      <a class="mp-brand" href="${homeUrl}"><span>标</span>标普全球CSA评估解读</a>
      <nav>${[['#process', '评估流程'], ['#dimensions', '三大维度'], ['#topics', '标准目录'], ['#sources', '说明']].map(([target, label]) => `<a href="${target}">${label}</a>`).join('')}</nav>
    </div></header>`;

    const hero = `<section class="mh-hero"><div class="mh-hero-inner">
      <div class="mh-crumb"><a href="${homeUrl}">知识学堂</a><span>/</span>标普全球CSA企业可持续发展评估</div>
      <div class="mh-hero-grid"><div>
        <span class="mp-eyebrow">${esc(standard.eyebrow || '企业可持续发展评估')} · ASSESSMENT</span>
        <h1>${esc(standard.title)}</h1><p>${esc(standard.description)}</p>
        <div class="mp-hero-tags">${['62 个行业问卷', '34 个评估标准', '0–100 分制', 'MSA 争议调整'].map(value => `<span>${esc(value)}</span>`).join('')}</div>
      </div><div class="mp-hero-side">
        <article><small>评估标准</small><strong>${topicCount}</strong></article>
        <article><small>评估维度</small><strong>${groups.length}</strong></article>
        <article><small>评估流程</small><strong>${process.length} 步</strong></article>
        <article><small>行业问卷</small><strong>62</strong></article>
      </div></div>
    </div></section>`;

    /* 01 评估流程：七步走完一张问卷到最终评分 */
    const steps = process.map((step, index) => `
      <article class="mh-module-card mp-card">
        <span class="mh-card-number">${number(index + 1)}</span><small>评估流程</small>
        <h3>${esc(step.title)}</h3><p>${esc(clip(step.description, 88))}</p>
        <div><b>${esc(STEP_NOTES[step.title] || '')}</b><span>第 ${number(index + 1)} 步</span></div>
      </article>`).join('');

    /* 02 三大维度：每个维度给主题数、问题量与权重最高的标准 */
    const dims = groups.map((group, index) => {
      const items = group.items || [];
      const questions = items.reduce((sum, item) => sum + pickNumber(item.meta?.[1]), 0);
      const top = [...items].sort((a, b) => pickWeight(b.meta?.[0]) - pickWeight(a.meta?.[0])).slice(0, 3);
      return `<section class="mp-card cs-dim" id="cs-dim-${index}">
        <header><span>${number(index + 1)}</span><div><b>${esc(group.title)}</b><small>${items.length} 个标准 · 约 ${questions} 个问题</small></div></header>
        <ul>${top.map(item => `<li><a href="${topicHref(item.id)}">${esc(item.title)}<small>${esc(item.meta?.[0] || '')}</small></a></li>`).join('')}</ul>
        <a class="cs-dim-more" href="#pillar-${index}">查看全部 ${items.length} 个标准 →</a>
      </section>`;
    }).join('');

    /* 03 标准目录：三维度分组，卡片带权重与问题数 */
    const jump = groups.map((group, index) => [`#pillar-${index}`, group.title])
      .map(([target, label]) => `<a href="${target}">${esc(label)}<span>→</span></a>`).join('');
    const pillars = groups.map((group, groupIndex) => `
      <section class="mh-pillar mp-card" id="pillar-${groupIndex}">
        <header><div><small>${number(groupIndex + 1)} · ${esc(group.title)}</small><h3>${esc(group.title)}标准</h3></div><strong>${group.items.length} 个标准</strong></header>
        <div class="mh-theme"><div class="mh-topic-grid">${group.items.map(item => `
          <a class="mh-topic-card" href="${topicHref(item.id)}">
            <h4>${esc(item.title)}</h4><p>${esc(clip(item.summary, 72))}</p>
            <div><span>${esc((item.meta || []).join(' · '))}</span><b>查看解读 →</b></div>
          </a>`).join('')}</div></div>
      </section>`).join('');

    return `<div class="msci-hub-page cs-standard-page">
      ${topbar}
      ${hero}
      <main class="mh-page">
        <a class="mh-back" href="${homeUrl}">← 返回知识学堂</a>

        <section class="mp-section" id="process">
          <div class="mp-section-head"><div class="mp-section-title"><span>01</span><h2>评估流程</h2></div><p>从行业问卷设计到最终评分发布，共七步；评分同时反映披露透明度与绩效表现</p></div>
          <div class="mh-module-grid cols-4">${steps}</div>
        </section>

        <section class="mp-section" id="dimensions">
          <div class="mp-section-head"><div class="mp-section-title"><span>02</span><h2>三大维度</h2></div><p>维度之下是标准，标准之下是问题；权重按行业自下而上确定，同一标准在不同行业权重不同</p></div>
          <div class="cs-dims">${dims}</div>
        </section>

        <section class="mp-section" id="topics">
          <div class="mp-section-head"><div class="mp-section-title"><span>03</span><h2>标准目录</h2></div><p>34 个标准按维度分组，卡片标注平均权重与问题数；权重随行业问卷不同</p></div>
          <div class="mh-pillar-jump">${jump}</div>
          <div class="mh-pillar-stack">${pillars}</div>
        </section>

        <section class="mp-section" id="sources">
          <div class="mp-section-head"><div class="mp-section-title"><span>04</span><h2>来源与说明</h2></div><p>本页是学习索引与方法摘要，正式评估请以 S&P Global 当期官方材料为准</p></div>
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
