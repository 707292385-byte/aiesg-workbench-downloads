(function () {
  'use strict';

  const structures = {
    ashare: ['沪 · 深 · 北交易所版本', '披露四要素', '环境 · 社会 · 治理议题', '对应条款与证据'],
    hkex: ['ESG报告守则与气候规定', '披露模块', 'KPI与气候主题', '对应规则与指引'],
    csa: ['行业特定问卷', '治理 · 环境 · 社会维度', '可持续发展标准', '评估问题与依据'],
    sbti: ['科学碳目标与参与路径', '排放基线 · 目标边界', '目标设定方法与雄心', '提交SBTi验证', '披露 · 复核 · 版本过渡'],
    ghg: ['温室气体核算体系基础', '组织边界与合并方法', '三个范围总览', '范围二：外购电力与间接排放', '范围三：价值链间接排放', '核算、报告与核查'],
    tcfd: ['TCFD 与气候相关财务披露', '治理支柱', '战略支柱', '风险管理支柱', '指标与目标', '转型计划与国际准则承接'],
    cdp: ['CDP 是什么', '企业问卷结构', '气候评分方法', '水安全评分', '森林评分', '评分等级与披露实务'],
    assurance: ['ESG 鉴证是什么', 'AA1000 系列', '审验类型与程度', 'ISSA 5000', '中国准则 6101 号', '鉴证实务'],
    tnfd: ['TNFD 与自然相关披露', 'LEAP 方法', '治理支柱', '战略支柱', '风险管理', '指标与目标'],
    esrs: ['CSRD 与授权条例', '双重重要性', '12 项准则架构', '披露要求与应用要求', '价值链边界', '过渡与衔接'],
    sustainalytics: ['风险评级的两个维度', '敞口评估', '管理评估', '不可管理风险', '五个风险等级', '读分与实践'],
    cass: ['对接交易所指引', '四级指标体系', '环境板块', '社会板块', '治理板块', '编制流程与评级'],
    oecd: ['政府间建议', '十一章结构', '尽责管理六步', '影响关系与相称性', '国家联络点', '与其他框架衔接'],
    iso26000: ['指南性标准定位', '七项原则', '七大核心主题', '社会责任辨识', '融入组织路径', '与披露标准的边界'],
    csddd: ['适用范围与时间表', '活动链边界', '风险识别与排序', '预防、减轻与补救', '申诉、监测与监督'],
    eubr: ['电池分类与责任主体', '安全、性能与循环设计', '碳足迹与再生材料', '标签、二维码与电池护照', '供应链尽职调查'],
    eudr: ['商品与产品范围', '零毁林、合法性与尽调', '信息、评估与风险减轻', '地理定位与尽调声明', '风险分类与监管检查']
  };
  const labels = {
    ashare: { short: 'A股', type: '交易所披露规则', group: '披露主题' },
    hkex: { short: '港交所', type: 'ESG披露体系', group: '知识模块' },
    csa: { short: 'CSA', type: '企业可持续发展评估', group: '评估标准' },
    sbti: { short: 'SBTi', type: '科学碳目标方法学', group: '知识模块' },
    ghg: { short: 'GHG', type: '温室气体核算方法学', group: '知识模块' },
    tcfd: { short: 'TCFD', type: '气候相关财务披露框架', group: '国际披露准则' },
    cdp: { short: 'CDP', type: '全球环境信息披露与评分平台', group: '评估标准' },
    assurance: { short: '鉴证', type: '可持续信息鉴证准则', group: '知识模块' },
    tnfd: { short: 'TNFD', type: '自然相关财务披露框架', group: '国际披露准则' },
    esrs: { short: 'ESRS', type: '欧盟可持续报告准则', group: '知识模块' },
    sustainalytics: { short: 'Sustainalytics', type: 'ESG 风险评级方法学', group: '知识模块' },
    cass: { short: 'CASS', type: '中国企业可持续报告指南', group: '知识模块' },
    oecd: { short: 'OECD', type: '负责任商业行为准则', group: '知识模块' },
    iso26000: { short: 'ISO 26000', type: '社会责任指南', group: '知识模块' },
    csddd: { short: 'CSDDD', type: '欧盟企业可持续发展尽职调查指令', group: '尽调模块' },
    eubr: { short: 'EUBR', type: '欧盟电池及废电池法规', group: '合规模块' },
    eudr: { short: 'EUDR', type: '欧盟零毁林产品法规', group: '合规模块' }
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
    const knowledgeMap = (standard.knowledgeMap || structure).map((node, index) => typeof node === 'string'
      ? { title: node, desc: '' }
      : { title: node.title || `结构节点 ${index + 1}`, desc: node.desc || '' });
    const topicCount = groups.reduce((sum, group) => sum + (group.items || []).length, 0);
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
      <header class="mp-topbar"><div class="mp-topbar-inner"><a class="mp-brand" href="${href('index.html')}"><span>${esc(label.short.slice(0, 1))}</span>${esc(label.short)} 知识体系</a><nav><a href="#overview">结构</a><a href="#topics">主题</a><a href="#sources">来源</a></nav></div></header>
      <section class="mh-hero"><div class="mh-hero-inner"><div class="mh-crumb"><a href="${href('index.html')}">知识学堂</a><span>/</span>${esc(standard.title)}</div>
        <div class="mh-hero-grid"><div><span class="mp-eyebrow">${esc(label.type)} · 整体结构与主题索引</span><h1>${esc(standard.title)}</h1><p>${esc(standard.description)}</p><div class="mp-hero-tags"><span>${esc(standard.issuer || '')}</span><span>整体结构</span><span>主题索引</span></div></div>
          <div class="mp-hero-side"><article><small>结构节点</small><strong>${knowledgeMap.length}</strong></article><article><small>知识分组</small><strong>${groups.length}</strong></article><article><small>主题节点</small><strong>${topicCount}</strong></article></div>
        </div></div></section>
      <main class="mh-page"><a class="mh-back" href="${href('index.html')}">← 返回知识学堂</a>
      <section class="mp-section structured-overview" id="overview"><div class="mp-section-head"><div class="mp-section-title"><span>01</span><h2>知识结构</h2></div></div>
          <div class="structured-map" aria-label="${esc(`${standard.title}知识结构`)}">
            <div class="structured-map-root"><small>${esc(label.type)}</small><strong>${esc(standard.title)}</strong></div>
            <div class="structured-map-branches">${knowledgeMap.map((node, index) => `<article><span>${number(index + 1)}</span><div><strong>${esc(node.title)}</strong>${node.desc ? `<p>${esc(node.desc)}</p>` : ''}</div></article>`).join('')}</div>
          </div>
        </section>
        <section class="mp-section" id="topics"><div class="mp-section-head"><div class="mp-section-title"><span>02</span><h2>主题解读</h2></div><p>按主题进入具体要求、判断逻辑和官方依据</p></div><div class="mh-pillar-stack">${topicCards}</div></section>
        <section class="mp-section" id="sources"><div class="mp-section-head"><div class="mp-section-title"><span>03</span><h2>来源与使用边界</h2></div><p>核对发布机构现行资料</p></div><div class="mh-source mh-source-pair mp-card"><div><small>当前参考</small><p>${esc(standard.sourceNote || '来源信息整理中')}</p></div><div><small>阅读说明</small><p>${esc(standard.notice || '本页为知识关系与主题导航，正式工作请核对官方原文。')}</p></div></div></section>
      </main><footer class="mp-footer"><div><span>AI × ESG 工作台 · 知识关系与主题目录</span><span>正式工作请核对发布机构现行资料</span></div></footer>
    </div>`;
  };
})();
