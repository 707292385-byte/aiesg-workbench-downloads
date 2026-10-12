/* 财政部企业可持续披露准则体系目录页：与 MSCI 方法论页共用同一套 mp-/mh- 视觉体系。 */
(function () {
  'use strict';
  const number = value => String(value).padStart(2, '0');
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const clip = (value, limit = 84) => { const text = clean(value); return text.length > limit ? `${text.slice(0, limit)}…` : text; };

  /* 准则体系三层结构：具体准则与应用指南的制定遵循基本准则，应用指南对准则进行解释和细化 */
  const ARCH = [
    {
      no: '01', layer: '基本准则', id: 'mof-basic',
      file: '《企业可持续披露准则——基本准则（试行）》',
      note: '对企业可持续信息披露提出一般要求', gate: '遵循',
    },
    {
      no: '02', layer: '具体准则', id: 'mof-climate',
      file: '《企业可持续披露准则第1号——气候（试行）》',
      note: '对气候相关议题的信息披露提出具体要求', gate: '解释细化',
    },
    {
      no: '03', layer: '应用指南', id: 'mof-basic-guide',
      file: '准则应用指南 · 行业应用指南',
      note: '对准则进行解释和细化，并对有关行业应用准则提供指引', gate: '',
    },
  ];

  /* 官方文件短名（人工映射，避免机器缩略读不通） */
  const SHORT_NAMES = {
    '《企业可持续披露准则——基本准则（试行）》财会〔2024〕17号': '基本准则（试行）',
    '《〈企业可持续披露准则——基本准则（试行）〉应用指南》财会〔2025〕21号': '基本准则应用指南',
    '《企业可持续披露准则第1号——气候（试行）》财会〔2025〕34号': '气候准则第1号（试行）',
    '《〈企业可持续披露准则第1号——气候（试行）〉应用指南（征求意见稿）》财办会〔2026〕34号': '气候准则应用指南（征求意见稿）',
    '《〈企业可持续披露准则第1号——气候（试行）〉电力等9项行业应用指南（征求意见稿）》财办会〔2026〕34号': '电力等9项行业应用指南（征求意见稿）',
    '《〈企业可持续披露准则第1号——气候（试行）〉应用指南（征求意见稿）》及电力等9项行业应用指南（征求意见稿）起草说明': '应用指南与行业指南起草说明',
  };
  const TIME_NOTES = {
    '财会〔2024〕17号': '2024年12月起施行',
    '财会〔2025〕21号': '2025年9月印发 · 企业自愿实施',
    '财会〔2025〕34号': '2025年印发 · 已施行',
    '财办会〔2026〕34号': '征求意见中 · 反馈截止 2026年10月26日',
  };
  const shortFile = name => SHORT_NAMES[clean(name)] || clean(name);
  const docNo = name => { const m = clean(name).match(/财[会办会]*〔\d{4}〕\d+号/); return m ? m[0] : ''; };

  window.renderMofStandardV2 = function ({ standard, esc, href }) {
    const groups = standard.groups || [];
    const files = standard.officialFiles || [];
    const released = files.filter(file => !file.name.includes('征求意见稿'));
    const pending = files.filter(file => file.name.includes('征求意见稿'));
    const topicCount = groups.reduce((sum, group) => sum + group.items.length, 0);
    const industryGroup = groups.find(group => group.id === 'industry') || { items: [] };
    const industryCount = Math.max(0, industryGroup.items.length - 1);
    const homeUrl = href('index.html');
    const topicHref = id => href('topic.html', { standard: standard.id, id });
    const industryCards = standard.industryCards || [];

    const topbar = `<header class="mp-topbar"><div class="mp-topbar-inner">
      <a class="mp-brand" href="${homeUrl}"><span>财</span>财政部可持续披露准则解读</a>
      <nav>${[['#framework', '体系框架'], ['#files', '文件状态'], ['#topics', '主题目录'], ['#sources', '来源']].map(([target, label]) => `<a href="${target}">${label}</a>`).join('')}</nav>
    </div></header>`;

    const hero = `<section class="mh-hero"><div class="mh-hero-inner">
      <div class="mh-crumb"><a href="${homeUrl}">知识学堂</a><span>/</span>财政部企业可持续披露准则体系</div>
      <div class="mh-hero-grid"><div>
        <span class="mp-eyebrow">${esc(standard.eyebrow || '国家统一可持续披露准则')} · DISCLOSURE</span>
        <h1>${esc(standard.title)}</h1><p>${esc(standard.description)}</p>
        <div class="mp-hero-tags">${['基本准则', '气候准则', '应用指南', '九项行业指南'].map(value => `<span>${esc(value)}</span>`).join('')}</div>
      </div><div class="mp-hero-side">
        <article><small>体系层级</small><strong>${ARCH.length}</strong></article>
        <article><small>已发布文件</small><strong>${released.length}</strong></article>
        <article><small>征求意见中</small><strong>${pending.length}</strong></article>
        <article><small>知识主题</small><strong>${topicCount}</strong></article>
      </div></div>
    </div></section>`;

    /* 01 体系框架：三层结构，逐层向下 */
    const arch = ARCH.map((node, index) => `
      <div class="mo-arch-row">
        <span class="mo-arch-no">${node.no}</span>
        <div class="mo-arch-body"><b>${esc(node.layer)}</b><em>${esc(node.file)}</em><p>${esc(node.note)}</p></div>
        <a class="mo-arch-link" href="${topicHref(node.id)}">查看 <span>→</span></a>
      </div>
      ${index < ARCH.length - 1 ? `<div class="mo-arch-gate"><i>↓</i><span>${esc(ARCH[index + 1].gate)}</span></div>` : ''}`).join('');

    /* 02 文件状态：已发布 / 征求意见中 */
    /* 文件行元信息：有文号取文号与对应注记；无文号的随文文件（如起草说明）按随征求意见稿印发处理 */
    const fileMeta = file => {
      const no = docNo(file.name);
      if (no) return [TIME_NOTES[no] || no, no];
      return [TIME_NOTES['财办会〔2026〕34号'] || '', '随文印发'];
    };
    const fileList = list => list.length ? `<ul>${list.map(file => {
      const [note, chip] = fileMeta(file);
      return `<li><a href="${esc(file.url)}" target="_blank" rel="noreferrer"><div><span class="mo-file-name">${esc(shortFile(file.name))}</span><small>${esc(note)}</small></div><code>${esc(chip)}</code></a></li>`;
    }).join('')}</ul>` : '';
    const fileBoard = `<div class="mo-files">
      <section class="mp-card is-released"><header><b>已发布</b><span>${released.length} 份</span></header>${fileList(released)}</section>
      <section class="mp-card is-pending"><header><b>征求意见中</b><span>${pending.length} 份</span></header>${fileList(pending)}</section>
      <p class="mo-files-note">征求意见稿（财办会〔2026〕34号）2026年9月28日印发，反馈截止2026年10月26日，尚未生效。准则应用指南聚焦共性问题、对气候准则部分条款解释说明；行业应用指南聚焦行业特定事项——两者相互衔接、各有侧重。</p>
    </div>`;

    /* 03 主题目录 */
    const industryOverview = group => group.id === 'industry' && industryCards.length ? `
        <div class="mh-ind-grid">${industryCards.map(card => `
          <a class="mh-ind-card" href="${topicHref(card.id)}"><b>${esc(card.title)}</b><p>${esc(card.content)}</p></a>`).join('')}</div>` : '';
    const pillars = groups.map((group, groupIndex) => `
      <section class="mh-pillar mp-card" id="group-${groupIndex}">
        <header><div><small>${number(groupIndex + 1)} · ${group.id === 'industry' ? '征求意见稿' : '已发布'}</small><h3>${esc(group.title)}</h3></div><strong>${group.items.length} 个主题</strong></header>
        <div class="mh-theme">${industryOverview(group)}<div class="mh-topic-grid">${group.items.map(item => `
          <a class="mh-topic-card" href="${topicHref(item.id)}">
            <h4>${esc(item.title)}</h4><p>${esc(clip(item.summary, 72))}</p>
            <div><span>${esc(item.eyebrow || '')}</span><b>查看解读 →</b></div>
          </a>`).join('')}</div></div>
      </section>`).join('');

    return `<div class="msci-hub-page mo-standard-page">
      ${topbar}
      ${hero}
      <main class="mh-page">
        <a class="mh-back" href="${homeUrl}">← 返回知识学堂</a>

        <section class="mp-section" id="framework">
          <div class="mp-section-head"><div class="mp-section-title"><span>01</span><h2>体系框架</h2></div><p>基本准则提出一般要求，具体准则落到议题，应用指南负责解释细化与行业指引</p></div>
          <div class="mo-arch mp-card">${arch}</div>
          <p class="mh-usage-note">三层结构出自《基本准则（试行）》第二条；应用指南分为准则应用指南与行业应用指南，前者聚焦共性问题，后者聚焦行业特定事项。</p>
        </section>

        <section class="mp-section" id="files">
          <div class="mp-section-head"><div class="mp-section-title"><span>02</span><h2>文件状态</h2></div><p>先分清已发布文件与征求意见稿，再决定准备工作的口径</p></div>
          ${fileBoard}
          <section class="mp-card mo-exchange">
            <header><b>与交易所指引的关系</b><span>两级规则 · 编制报告时分别核对</span></header>
            <div class="mo-exchange-grid">
              <div class="mo-exchange-col">
                <small>国家统一可持续披露准则</small>
                <b>财政部企业可持续披露准则</b>
                <p>由财政部会同相关部门制定，面向各类企业</p>
              </div>
              <div class="mo-exchange-vs"><span>对照</span></div>
              <div class="mo-exchange-col">
                <small>上市公司层面的具体披露规则</small>
                <b>交易所可持续发展报告指引</b>
                <p>由上海、深圳、北京证券交易所发布，适用于上市公司</p>
              </div>
            </div>
          </section>
        </section>

        <section class="mp-section" id="topics">
          <div class="mp-section-head"><div class="mp-section-title"><span>03</span><h2>主题目录</h2></div><p>按体系与定位、基本准则、气候准则、行业应用指南四组进入</p></div>
          <div class="mh-pillar-stack">${pillars}</div>
        </section>

        <section class="mp-section" id="sources">
          <div class="mp-section-head"><div class="mp-section-title"><span>04</span><h2>来源与说明</h2></div><p>正式披露前请核对财政部现行文件</p></div>
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
