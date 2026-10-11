/* 通用知识体系首页渲染器：GRI / SASB / IFRS / EcoVadis / 国证ESG 共用，
   与 MSCI / A股 / 财政部 / 港交所 / 标普CSA 同一套 mp-/mh- 视觉体系。 */
(function () {
  'use strict';
  const number = value => String(value).padStart(2, '0');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const clip = (value, limit = 84) => { const text = clean(value); return text.length > limit ? `${text.slice(0, limit)}…` : text; };

  window.renderStandardsHubV2 = function ({ standard, esc, href }) {
    const hub = standard.hub || {};
    const groups = standard.groups || [];
    const topicCount = groups.reduce((sum, group) => sum + group.items.length, 0);
    const homeUrl = href('index.html');
    const topicHref = id => href('topic.html', { standard: standard.id, id });
    const nav = [['#framework', '体系结构'], ['#topics', '主题目录'], ['#sources', '来源']]
      .map(([target, label]) => `<a href="${target}">${label}</a>`).join('');

    const topbar = `<header class="mp-topbar"><div class="mp-topbar-inner">
      <a class="mp-brand" href="${homeUrl}"><span>${esc(hub.brandChar || '知')}</span>${esc(hub.brandText || standard.title)}</a>
      <nav>${nav}</nav>
    </div></header>`;

    const stats = (hub.stats && hub.stats.length ? hub.stats : [
      { label: '知识主题', value: String(topicCount) },
    ]).map(stat => `<article><small>${esc(stat.label)}</small><strong>${esc(stat.value)}</strong></article>`).join('');

    const hero = `<section class="mh-hero"><div class="mh-hero-inner">
      <div class="mh-crumb"><a href="${homeUrl}">知识学堂</a><span>/</span>${esc(standard.title)}</div>
      <div class="mh-hero-grid"><div>
        <span class="mp-eyebrow">${esc(standard.eyebrow || '')}</span>
        <h1>${esc(standard.title)}</h1><p>${esc(standard.description)}</p>
        <div class="mp-hero-tags">${(hub.tags || []).map(value => `<span>${esc(value)}</span>`).join('')}</div>
      </div><div class="mp-hero-side">${stats}</div></div>
    </div></section>`;

    /* 01 体系结构（可选 arch） */
    const archRows = (hub.arch || []).map((node, index) => `
      <div class="mo-arch-row">
        <span class="mo-arch-no">${esc(node.no || number(index + 1))}</span>
        <div class="mo-arch-body"><b>${esc(node.layer)}</b><em>${esc(node.file)}</em><p>${esc(node.note)}</p></div>
        <a class="mo-arch-link" href="${node.id ? topicHref(node.id) : '#topics'}">查看 <span>→</span></a>
      </div>
      ${index < hub.arch.length - 1 ? `<div class="mo-arch-gate"><i>↓</i><span>${esc(node.gate || '')}</span></div>` : ''}`).join('');
    const arch = hub.arch ? `
      <section class="mp-section" id="framework">
        <div class="mp-section-head"><div class="mp-section-title"><span>01</span><h2>体系结构</h2></div><p>${esc(hub.archDesc || '')}</p></div>
        <div class="mo-arch mp-card">${archRows}</div>
      </section>` : '';

    /* 02 主题目录 */
    const pillars = groups.map((group, groupIndex) => `
      <section class="mh-pillar mp-card" id="group-${groupIndex}">
        <header><div><small>${number(groupIndex + 1)} · ${esc(group.badge || '')}</small><h3>${esc(group.title)}</h3></div><strong>${group.items.length} 个主题</strong></header>
        <div class="mh-theme"><div class="mh-topic-grid">${group.items.map(item => `
          <a class="mh-topic-card" href="${topicHref(item.id)}">
            <h4>${esc(item.title)}</h4><p>${esc(clip(item.summary, 76))}</p>
            <div><span>${esc(item.eyebrow || '')}</span><b>查看解读 →</b></div>
          </a>`).join('')}</div></div>
      </section>`).join('');

    return `<div class="msci-hub-page hub-standard-page">
      ${topbar}
      ${hero}
      <main class="mh-page">
        <a class="mh-back" href="${homeUrl}">← 返回知识学堂</a>
        ${arch}
        <section class="mp-section" id="topics">
          <div class="mp-section-head"><div class="mp-section-title"><span>${hub.arch ? '02' : '01'}</span><h2>主题目录</h2></div><p>共 ${topicCount} 个知识主题，按分组进入</p></div>
          <div class="mh-pillar-stack">${pillars}</div>
        </section>
        <section class="mp-section" id="sources">
          <div class="mp-section-head"><div class="mp-section-title"><span>${hub.arch ? '03' : '02'}</span><h2>来源与说明</h2></div><p>正式工作请核对发布机构现行文件</p></div>
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
