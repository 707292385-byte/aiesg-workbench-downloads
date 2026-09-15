(function () {
  'use strict';

  const number = value => String(value).padStart(2, '0');
  const clean = value => String(value || '').replace(/^[•◦]\s*/, '').trim();
  const clip = (value, limit = 100) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > limit ? `${text.slice(0, limit)}…` : text;
  };

  function classify(title) {
    if (/范围|定位|概述|总览|定义/.test(title)) return ['定位与范围', 'overview'];
    if (/责任|要求|原则|要点|结构|框架/.test(title)) return ['关键要求', 'framework'];
    if (/流程|步骤|评估|核算|管理|实施/.test(title)) return ['工作方法', 'process'];
    if (/数据|指标|KPI|问题|主题|披露/.test(title)) return ['证据与数据', 'evidence'];
    if (/来源|提示|参考|附录/.test(title)) return ['使用边界', 'source'];
    return ['内容解读', 'content'];
  }

  function sectionBody(section, index, renderBlock, esc) {
    const blocks = section.blocks || [];
    const pointBlocks = blocks.filter(block => block.type === 'point');
    const otherBlocks = blocks.filter(block => block.type !== 'point');
    return `<section class="st-reading-section st-${classify(clean(section.title))[1]}" id="section-${index}" tabindex="-1">
      <header><span>${number(index + 1)} · ${classify(clean(section.title))[0]}</span><h2>${esc(clean(section.title) || `第${index + 1}节`)}</h2></header>
      <div class="st-reading-copy">${otherBlocks.map((block, blockIndex) => renderBlock(block, `${index}-${blockIndex}`)).join('')}</div>
      ${pointBlocks.length ? `<ul class="st-point-list">${pointBlocks.map(block => `<li>${esc(block.content_cn || block.content || '')}</li>`).join('')}</ul>` : ''}
    </section>`;
  }

  function questionBody(question, esc, renderBlock) {
    const entries = [
      ['评估重点', question.focus],
      ['问题原理', question.rationale],
      ['问题与选项', question.layout],
      ['定义与指引', question.guidance],
      ['数据要求', question.dataRequirements],
      ['披露要求', question.disclosure],
      ['标准与框架', question.frameworks],
      ['适用行业', question.industries],
      ['参考资料', question.references]
    ].filter(([, value]) => value);
    return `<details class="st-question"><summary><span>${esc(question.title || '问题组')}</span><small>查看评估要点与数据要求</small></summary><div class="st-question-body">${entries.map(([label, value], index) => `<section><h4>${esc(label)}</h4>${renderBlock({ type: 'text', content_cn: value }, `question-${question.id || 'item'}-${index}`)}</section>`).join('')}</div></details>`;
  }

  function questionGroups(groups, esc, renderBlock) {
    if (!groups.length) return '';
    const total = groups.reduce((sum, group) => sum + (group.questions || []).length, 0);
    return `<section class="st-question-section" id="questions"><header class="st-section-heading"><div><span>04 · 问题组与证据</span><h2>把评估标准落实到问题与资料</h2></div><p>${groups.length} 个关注主题 · ${total} 个已整理问题</p></header><div class="st-question-groups">${groups.map((group, index) => `<section class="st-question-group"><header><span>${number(index + 1)}</span><h3>${esc(group.title)}</h3><small>${(group.questions || []).length} 个问题</small></header><div>${(group.questions || []).map(question => questionBody(question, esc, renderBlock)).join('')}</div></section>`).join('')}</div></section>`;
  }

  window.renderStructuredTopicV2 = function ({ standard, item, group, detail, sections, relations = [], source, esc, renderBlock, href }) {
    const contentBlocks = sections.reduce((sum, section) => sum + (section.blocks || []).length, 0);
    const questionCount = (detail.questionGroups || []).reduce((sum, groupItem) => sum + (groupItem.questions || []).length, 0);
    const route = sections.slice(0, 6).map((section, index) => `<a href="#section-${index}"><span>${number(index + 1)}</span><strong>${esc(clean(section.title))}</strong></a>`).join('');
    const groupTitle = detail.group || group?.title || '';
    const facts = [...new Set([groupTitle, ...(detail.tags || item.tags || []).slice(0, 3)].filter(Boolean))];
    return `<div class="structured-topic-page" data-system="${esc(standard.id)}">
      <header class="mp-topbar"><div class="mp-topbar-inner"><a class="mp-brand" href="${href('index.html')}"><span>${esc(standard.id.slice(0, 1).toUpperCase())}</span>${esc(standard.id === 'ashare' ? 'A股' : standard.id === 'hkex' ? '港交所' : 'CSA')} 知识体系</a><nav><a href="#overview">概览</a><a href="#route">结构</a><a href="#reading">解读</a>${detail.questionGroups?.length ? '<a href="#questions">问题组</a>' : ''}<a href="#sources">来源</a></nav></div></header>
      <section class="st-hero"><div class="st-hero-inner"><div><div class="mh-crumb"><a href="${href('index.html')}">知识学堂</a><span>/</span><a href="${href('standard.html', { id: standard.id })}">${esc(standard.title)}</a><span>/</span>${esc(detail.title || item.title)}</div><span class="mp-eyebrow">${esc(detail.eyebrow || item.eyebrow || groupTitle || '知识主题')} · 结构化解读</span><h1>${esc(detail.title || item.title)}</h1><p>${esc(detail.summary || item.summary || '')}</p><div class="mp-hero-tags">${facts.map(value => `<span>${esc(value)}</span>`).join('')}</div></div><div class="st-hero-stats"><article><small>内容章节</small><strong>${sections.length}</strong></article><article><small>知识内容</small><strong>${contentBlocks}</strong></article><article><small>核心要点</small><strong>${sections.reduce((sum, section) => sum + (section.blocks || []).filter(block => block.type === 'point').length, 0)}</strong></article><article><small>${questionCount ? '问题条目' : '所属模块'}</small><strong>${questionCount || esc(groupTitle || '—')}</strong></article></div></div></section>
      <main class="st-main"><a class="mh-back" href="${href('standard.html', { id: standard.id })}">← 返回${esc(standard.id === 'ashare' ? 'A股' : standard.id === 'hkex' ? '港交所' : 'CSA')}方法论</a>
        <section class="st-overview" id="overview"><header class="st-section-heading"><div><span>01 · 主题定位</span><h2>先理解这个主题解决什么问题</h2></div><p>从适用范围、关键判断和资料依据进入完整内容。</p></header><div class="st-overview-grid"><article><small>所属体系</small><strong>${esc(standard.title)}</strong><p>${esc(standard.issuer || '')}</p></article><article><small>所属模块</small><strong>${esc(groupTitle || '—')}</strong><p>${esc(detail.eyebrow || item.eyebrow || '')}</p></article><article><small>阅读重点</small><strong>${sections.length} 个内容节点</strong><p>${esc(clip((detail.tags || item.tags || []).join(' · ') || '查看要求、判断路径和对应资料'))}</p></article><article><small>使用边界</small><strong>以现行原文为准</strong><p>本页用于理解结构与定位，不替代发布机构的正式文件。</p></article></div></section>
        <section class="st-route" id="route"><header class="st-section-heading"><div><span>02 · 内容结构</span><h2>沿着这条路径理解主题</h2></div><p>入口用于定位，下面保留连续、完整的正文与要点。</p></header><div class="st-route-map">${route}</div></section>
        <section class="st-reading" id="reading"><header class="st-section-heading"><div><span>03 · 主题解读</span><h2>要求、方法与证据</h2></div><p>完整内容按原有逻辑连续展开，便于依次阅读和回到具体依据。</p></header>${sections.map((section, index) => sectionBody(section, index, renderBlock, esc)).join('')}</section>
        ${questionGroups(detail.questionGroups || [], esc, renderBlock)}
        ${relations.length ? `<section class="st-relations" id="relations"><header class="st-section-heading"><div><span>${detail.questionGroups?.length ? '05' : '04'} · 关联知识</span><h2>把这个主题放回完整工作关系</h2></div><p>这些关系帮助定位前后依赖与关联议题。</p></header><div class="st-relation-grid">${relations.map((value, index) => `<article><span>${number(index + 1)}</span><p>${esc(value)}</p></article>`).join('')}</div></section>` : ''}
        <section class="st-sources" id="sources"><header class="st-section-heading"><div><span>${detail.questionGroups?.length ? (relations.length ? '06' : '05') : (relations.length ? '05' : '04')} · 来源与使用说明</span><h2>回到依据，核对适用版本</h2></div><p>专业判断以发布机构现行文件为准。</p></header><div class="st-source-grid"><article><small>本页参考</small><p>${esc(source || '来源信息整理中')}</p></article><article><small>使用提醒</small><p>${esc(detail.status || item.status || standard.notice || '本页用于知识梳理与工作准备，正式披露或评价请核对现行原文。')}</p></article></div></section>
      </main><footer class="mp-footer"><div><span>AI × ESG 工作台 · 方法论拆解与知识关联</span><span>正式工作请核对发布机构现行原文</span></div></footer>
    </div>`;
  };
})();
