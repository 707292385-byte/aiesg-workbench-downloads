(function () {
  'use strict';

  const communityForms = {
    question: 'https://my.feishu.cn/share/base/shrcnnchBl28MlLU22mTkhafOQg',
    contact: 'https://my.feishu.cn/share/base/shrcnUKzCwW2jbt1Vi9asLGutEh'
  };
  const counterApi = 'https://aiesg-community-counters.aiesg-beta-feedback-worker.workers.dev';
  const viewKey = 'aiesg-community-view-v1';
  const likeKey = 'aiesg-community-author-like-v1';
  let viewSubmitted = false;
  let viewPending = false;
  let likedInMemory = false;
  let likePending = false;
  let knownLikes = null;
  const iconPaths = {
    methods: '<path d="M4 5.5c2.7-1.2 5.1-1.2 8 0v13c-2.9-1.2-5.3-1.2-8 0z"/><path d="M12 5.5c2.9-1.2 5.3-1.2 8 0v13c-2.7-1.2-5.1-1.2-8 0z"/><path d="M12 5.5v13"/>',
    news: '<path d="M4 17.5h16"/><path d="m5 13 4-4 3 2 6-6"/><path d="M15 5h3v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    map: '<path d="m3.5 6 5.7-2.2 5.6 2.2 5.7-2.2v14.4l-5.7 2.2-5.6-2.2-5.7 2.2z"/><path d="M9.2 3.8v14.4M14.8 6v14.4"/>',
    person: '<circle cx="12" cy="8" r="3.2"/><path d="M5.3 20c.6-3.5 3-5.2 6.7-5.2s6.1 1.7 6.7 5.2"/>',
    support: '<path d="M12 3 20 6v6c0 4.8-3 7.9-8 9-5-1.1-8-4.2-8-9V6z"/><path d="m8.5 12 2.4 2.4 4.8-4.8"/>',
    ai: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6z"/>',
    cooperate: '<path d="M3 9.5 7 6l4.2 2.1 3.4-1.5L21 9.5l-6.8 7.2a2 2 0 0 1-2.8.1l-4.7-4.1"/><path d="m9.5 10.2 2.9-2.6"/><path d="m5.7 13.2-2.4-2.5"/><path d="m18.3 13.2 2.4-2.5"/>'
  };
  const svgIcon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + iconPaths[name] + '</svg>';
  const embedded = new URLSearchParams(location.search).get('embed') === '1';
  let lastActivitySignal = 0;
  function notifyActivity() {
    if (!embedded || window.parent === window || !window.parent?.postMessage) return;
    const now = Date.now();
    if (now - lastActivitySignal < 5000) return;
    lastActivitySignal = now;
    window.parent.postMessage({ type: 'aiesg:community-activity' }, '*');
  }
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(name =>
    document.addEventListener(name, notifyActivity, { passive: true, capture: true })
  );
  function pageHref(page, values = {}) {
    const url = new URL(page, location.href);
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    if (embedded) url.searchParams.set('embed', '1');
    return url.pathname.split('/').pop() + url.search;
  }
  const publicReportsUrl = 'https://707292385-byte.github.io/aiesg-workbench-downloads/academy/reports.html';
  function reportPageHref(values = {}) {
    const localPreview = location.protocol === 'file:';
    const url = new URL(localPreview ? publicReportsUrl : 'reports.html', location.href);
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    if (embedded) url.searchParams.set('embed', '1');
    return localPreview ? url.href : url.pathname.split('/').pop() + url.search;
  }
  const standards = [
    { id: 'msci', type: '评级方法', title: 'MSCI ESG评级方法论', detail: '行业权重 · 关键议题 · 评级流程', summary: '围绕行业关键议题，了解企业面临的环境、社会与治理风险及其管理能力，梳理议题权重、评分逻辑与评级流程。' },
    { id: 'csa', type: '可持续评估', title: '标普全球CSA企业可持续发展评估', detail: '62行业问卷 · 34标准 · 三大维度', summary: '以行业问卷为入口，了解标普全球企业可持续发展评估的环境、社会与治理维度，梳理评估标准、填报要点和支持材料。' },
    { id: 'ecovadis', type: '评级方法', title: 'EcoVadis 可持续评级方法学', detail: '奖牌徽章 · 碳评级 · 供应链', summary: '从环境、劳工与人权、商业道德和可持续采购四大主题，了解企业可持续管理体系的评估思路，以及政策、行动和结果的证据要求。' },
    { id: 'guozheng', type: '评级方法', title: '国证ESG评价体系', detail: 'E/S/G三维度 · 15主题 · 本土指标' },
    { id: 'gri', type: '披露规则', title: 'GRI 可持续发展报告标准', detail: '通用标准 · 33项议题标准 · 行业标准' },
    { id: 'ifrs', type: '披露规则', title: 'ISSB准则（IFRS S1/S2）', detail: '一般要求 · 气候披露 · 四支柱' },
    { id: 'sasb', type: '披露规则', title: 'SASB 行业可持续会计标准', detail: '11板块 · 77行业 · 财务重要性' },
    { id: 'ashare', type: '披露规则', title: 'A股可持续发展报告指引', detail: '三所指引 · 25项议题 · 编制指南' },
    { id: 'mof', type: '披露规则', title: '财政部企业可持续披露准则体系', detail: '基本准则 · 气候准则 · 行业指南' },
    { id: 'hkex', type: '披露规则', title: '港交所ESG披露体系', detail: '报告守则 · KPI体系 · 气候披露' }
  ];

  // 直接双击本地页面时，浏览器会阻止读取相邻 JSON；仅保留首页所需的行业与三条近期资讯作为回退。
  const localFallbackData = {"reports":{"companyCount":8282,"reportCount":42235,"industryOptions":[["恒生","公用事业(HS)"],["恒生","医疗保健业(HS)"],["恒生","原材料业(HS)"],["恒生","地产建筑业(HS)"],["恒生","工业(HS)"],["恒生","必需性消费(HS)"],["恒生","电讯业(HS)"],["恒生","综合企业(HS)"],["恒生","能源业(HS)"],["恒生","资讯科技业(HS)"],["恒生","金融业(HS)"],["恒生","非必需性消费(HS)"],["申万","交通运输"],["申万","传媒"],["申万","公用事业"],["申万","农林牧渔"],["申万","医药生物"],["申万","商贸零售"],["申万","国防军工"],["申万","基础化工"],["申万","家用电器"],["申万","建筑材料"],["申万","建筑装饰"],["申万","房地产"],["申万","有色金属"],["申万","机械设备"],["申万","汽车"],["申万","煤炭"],["申万","环保"],["申万","电力设备"],["申万","电子"],["申万","石油石化"],["申万","社会服务"],["申万","纺织服饰"],["申万","综合"],["申万","美容护理"],["申万","计算机"],["申万","轻工制造"],["申万","通信"],["申万","钢铁"],["申万","银行"],["申万","非银金融"],["申万","食品饮料"]]},"observations":[{"id":"efrag-agenda-consultation-2026","category":"国际标准","title":"EFRAG启动2027–2029可持续报告议程咨询","summary":"EFRAG于10月16日发布意见征集（RFI），就2027–2029年可持续报告工作优先级公开征求意见，反馈截止2027年2月15日；前提是除欧委会要求的紧急修订外，该期间不安排新的准则制定活动，工作重心转向实施支持、自愿报告与全球互操作，工作计划拟2027年二季度发布。","date":"2026-10-16"},{"id":"us-ca-sb253-initial-regulation-2026","category":"国际监管","title":"加州SB 253/261初始法规获批并生效：首期温室气体报告截止日确定为11月10日","summary":"加州行政法办公室（OAL）于2026年10月12日批准加州空气资源委员会（CARB）就SB 253与SB 261制定的《加州企业温室气体报告与气候相关财务风险披露初始法规》，该法规当日生效，编入加州法规第17篇第96070至96077节。首期范围一、范围二温室气体报告截止日就此确定为2026年11月10日；SB 261仍因法院禁令暂停执行。","date":"2026-10-12"},{"id":"singapore-acra-roadmap-2026","category":"国际标准","title":"新加坡ACRA更新气候报告路线图：鉴证强制时点明确，准则草案咨询10月25日截止","summary":"新加坡会计与企业管制局（ACRA）10月初更新气候报告路线图运行参数：上市发行人范围一/二有限鉴证自FY2029起，大型非上市企业FY2030起报告、FY2032起鉴证。配套的《新加坡可持续披露准则》草案公开咨询将于2026年10月25日截止，草案仅将气候准则SFRS S2设为强制。","date":"2026-10-05"}]};

  const socialProfiles = [
    { name: '小红书', image: 'assets/community/qr-xiaohongshu-source.jpg', crop: 'xhs' },
    { name: '微信公众号', image: 'assets/community/qr-wechat-official-tight.jpg', crop: 'official' },
    { name: '抖音', image: 'assets/community/qr-douyin-source.jpg', crop: 'douyin' },
    { name: '微信号', image: 'assets/community/qr-wechat-source.jpg', crop: 'wechat' }
  ];
  const contactOffers = [
    { image: 'assets/community/offer-project.png', title: '项目合作', description: 'ESG报告、评级、披露与项目推进的合作支持。' },
    { image: 'assets/community/offer-consulting.png', title: '咨询辅导', description: '围绕标准理解、工作方法与实际难题交流。' },
    { image: 'assets/community/offer-ai-practice.png', title: 'AI实践带练', description: '从真实工作场景练习AI整理、分析与复核。' },
    { image: 'assets/community/offer-business.png', title: '商务合作', description: '欢迎内容共创、培训合作、产品试用与沟通。' }
  ];
  const projectTools = [
    {
      key: 'workbench',
      title: 'AI×ESG 工作台',
      label: 'PROJECT 01',
      status: '可下载体验',
      description: '面向 ESG 咨询与企业实践的本地工作平台，把项目、任务、客户、知识和 AI 工具放进同一套工作流程。',
      features: ['项目与任务协同', '客户与项目资料', '知识学堂与报告查询', '可扩展的 AI Skill'],
      help: '../help/',
      download: 'https://github.com/707292385-byte/aiesg-workbench-downloads/releases'
    },
    {
      key: 'materiality',
      title: '双重重要性评估',
      label: 'PROJECT 02',
      status: '在线可用',
      description: '从议题识别、问卷收集到双维评分和动态矩阵，形成可调整、可导出的双重重要性评估底稿。',
      features: ['行业与标准议题库', '问卷包与答卷回导', '双阈值与动态矩阵'],
      tool: 'materiality.html',
      skillDownload: 'https://github.com/707292385-byte/double-materiality-assessment'
    },
    {
      key: 'todo',
      title: '待办清单',
      label: 'TOOL 03',
      status: '可自行部署',
      description: '个人待办应用：中文一句话录入自动解析日期时间，桌面端是可增删组件的看板，手机端是随时记录的标签页。每人一套独立部署，数据不共享。',
      features: ['一句话录入自动解析时间', '桌面组件看板', '手机标签页', '一人一实例数据隔离'],
      repo: 'https://github.com/707292385-byte/personal-todo-app',
      guide: 'https://github.com/707292385-byte/personal-todo-app#readme-ov-file'
    }
  ];

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const safeCount = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.floor(Number(value)) : 0;
  const validCounter = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
  function stored(kind, key) {
    try { return window[kind].getItem(key) === '1'; } catch (_) { return false; }
  }
  function remember(kind, key) {
    try { window[kind].setItem(key, '1'); } catch (_) {}
  }
  function countText(selector, label, count) {
    const node = document.querySelector(selector);
    if (node) node.textContent = count == null ? label + '暂不可用' : label + count + ' 次';
  }
  function countStatus(message = '') {
    const node = document.querySelector('[data-count-status]');
    if (node) node.textContent = message;
  }
  async function counterRequest(path, method = 'GET') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(counterApi + path, {
        method, cache: 'no-store', credentials: 'omit', signal: controller.signal
      });
      if (!response.ok) throw new Error('计数服务返回 ' + response.status);
      const data = await response.json();
      if (!data || data.ok !== true) throw new Error('计数结果无效');
      return data;
    } finally {
      clearTimeout(timer);
    }
  }
  function showLiked(button) {
    likedInMemory = true;
    renderLikeButton(button);
  }
  function renderLikeButton(button) {
    if (!button) return;
    const label = likedInMemory ? '♥ 已点赞' : '♡ 给作者点赞';
    const count = knownLikes == null ? '' : '<small>' + knownLikes + ' 次</small>';
    button.innerHTML = label + count;
    button.setAttribute('aria-pressed', String(likedInMemory));
    button.disabled = likedInMemory;
  }
  async function recordView() {
    if (viewSubmitted || viewPending || stored('sessionStorage', viewKey)) return;
    viewPending = true;
    try {
      const data = await counterRequest('/v1/community/view', 'POST');
      const total = validCounter(data.total);
      if (data.metric !== 'view' || total == null) throw new Error('浏览计数结果无效');
      viewSubmitted = true;
      remember('sessionStorage', viewKey);
      countText('[data-community-views]', '页面浏览 ', total);
    } catch (_) {
      countStatus('本次浏览暂未记录，稍后刷新可重试。');
    } finally {
      viewPending = false;
    }
  }
  async function initializeCounters() {
    const button = document.querySelector('[data-author-like]');
    if (likedInMemory || stored('localStorage', likeKey)) {
      likedInMemory = true;
      showLiked(button);
    }
    try {
      const data = await counterRequest('/v1/community/stats');
      const views = validCounter(data.views);
      const likes = validCounter(data.likes);
      if (views == null || likes == null) throw new Error('统计数据无效');
      countText('[data-community-views]', '页面浏览 ', views);
      knownLikes = likes;
      renderLikeButton(button);
    } catch (_) {
      countText('[data-community-views]', '页面浏览次数', null);
      renderLikeButton(button);
      countStatus('统计暂不可用，仍可阅读社区内容。');
    }
    await recordView();
  }
  async function recordLike(button) {
    if (!button || likedInMemory || likePending || stored('localStorage', likeKey)) return;
    likePending = true;
    button.disabled = true;
    button.textContent = '正在提交…';
    countStatus('');
    try {
      const data = await counterRequest('/v1/community/like', 'POST');
      const total = validCounter(data.total);
      if (data.metric !== 'like' || total == null) throw new Error('点赞计数结果无效');
      knownLikes = total;
      likedInMemory = true;
      remember('localStorage', likeKey);
      showLiked(button);
    } catch (_) {
      button.disabled = false;
      button.textContent = '♡ 给作者点赞';
      countStatus('点赞暂未保存，请稍后再试。');
    } finally {
      likePending = false;
    }
  }

  async function loadPublicData() {
    if (location.protocol !== 'file:') {
      try {
        const response = await fetch('assets/community-public.json', { cache: 'no-store' });
        if (response.ok) return await response.json();
      } catch (_) {}
    }
    return { observations: localFallbackData.observations };
  }

  function renderMap(publicData) {
    const regions = Array.isArray(publicData.regions) ? publicData.regions.filter(item => item && item.name && safeCount(item.count) > 0) : [];
    const partners = Array.isArray(publicData.partners) ? publicData.partners.filter(item => item && item.alias) : [];
    const total = regions.reduce((sum, item) => sum + safeCount(item.count), 0);
    const map = publicData.standard_map || {};
    const mapImage = typeof map.image === 'string' && /^assets\/community\/[\w./-]+\.(jpg|jpeg|png)$/i.test(map.image) && map.approval_no;
    const visual = mapImage
      ? '<img src="' + escapeHtml(map.image) + '" alt="已核对审图号的标准地图" />'
      : '<div class="co-map-number" aria-hidden="true">〇<small>共创伙伴 · 地区分布</small></div>';
    const source = mapImage ? '<span class="co-map-source">标准地图 ' + escapeHtml(map.approval_no) + '</span>' : '';
    const regionsHtml = regions.map(item => '<span>' + escapeHtml(item.name) + ' · ' + safeCount(item.count) + '</span>').join('');
    const partnersHtml = partners.map(item => '<span>' + escapeHtml(item.alias) + '</span>').join('');
    return '<div class="co-map-panel"><div class="co-map-stage"><div class="co-map-header"><div class="co-map-icon">' + svgIcon('map') + '</div><div><h3>共创伙伴地区分布</h3><p>只展示伙伴愿意公开的地区汇总。</p></div></div>' + visual + source + '</div>'
      + '<div class="co-map-copy"><span class="co-kicker">THANK YOU · CO-CREATORS</span><h3>感谢一起测试的共创伙伴</h3><p>从真实工作出发，一起试用、提出问题、完善体验。每一份反馈都让工作台更接近使用者的需要。</p>'
      + (regionsHtml ? '<div class="co-region-list" aria-label="公开地区分布">' + regionsHtml + '</div>' : '')
      + (partnersHtml ? '<div class="co-region-list" aria-label="公开共创代称">' + partnersHtml + '</div>' : '')
      + (total ? '<small>已公开的地区汇总：' + total + ' 人；未公开地区的伙伴不计入。</small>' : '<small>代称与地区只在伙伴愿意公开时展示。</small>')
      + '</div></div>';
  }

  function renderQuestion(item) {
    const category = escapeHtml(item.category || '共创问题');
    const title = escapeHtml(item.title || '');
    const summary = escapeHtml(item.summary || '');
    const detail = escapeHtml(item.detail || '');
    const submissions = safeCount(item.similar_submission_count);
    const views = safeCount(item.detail_views);
    const hasCounts = item.similar_submission_count != null || item.detail_views != null;
    return '<article class="co-question-card"><small>' + category + '</small><h4>' + title + '</h4><p>' + summary + '</p>'
      + (hasCounts ? '<div class="co-heat"><span>同类提问 <b>' + submissions + ' 条</b></span><span>阅读 <b>' + views + ' 次</b></span></div>' : '')
      + (detail ? '<details><summary>查看问题</summary><p>' + detail + '</p></details>' : '')
      + '</article>';
  }

  function renderSocial() {
    return '<section class="co-social-area" aria-label="Xiao〇的平台二维码"><div class="co-social-heading"><span>FIND ME</span><h3>在这些平台找到 Xiao〇</h3><p>扫描二维码，继续交流 ESG、AI 与工作台的开发。</p></div><div class="co-social-grid">'
      + socialProfiles.map(item => '<article class="co-social-card"><div class="co-qr-window co-qr-window--' + item.crop + '">'
        + (item.image ? '<img src="' + item.image + '" alt="' + item.name + '二维码" decoding="sync">' : '<span>二维码待补充</span>')
        + '</div><strong>' + item.name + '</strong></article>').join('')
      + '</div></section>';
  }

  function renderOffers() {
    return '<div class="co-offers">' + contactOffers.map(item => '<article class="co-offer co-offer--compact"><div class="co-offer-illustration"><img src="' + item.image + '" alt="' + item.title + '服务场景插画"></div><div class="co-offer-copy"><h3>' + item.title + '</h3><p>' + item.description + '</p></div><span class="co-offer-paid">付费</span></article>').join('') + '</div>'
      + '<div class="co-contact-entry"><div><small>联系 Xiao〇</small><p>可以提出一个问题，也可以选择合作方向并留下回复方式。</p></div><div class="co-contact-actions"><button type="button" class="co-action-btn" data-open-community-form="question">提出一个问题</button><button type="button" class="co-action-btn" data-open-community-form="contact">联系与合作</button></div></div>';
  }

  function publicQuestions(publicData) {
    return Array.isArray(publicData.questions)
      ? publicData.questions.filter(item => item && typeof item.title === 'string' && item.title.trim())
      : [];
  }

  function publicObservations(publicData) {
    return (Array.isArray(publicData.observations) ? publicData.observations : [])
      .filter(item => item && typeof item.title === 'string' && item.title.trim())
      .slice()
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || ''), 'zh-CN'));
  }

  function emptyState(message) {
    return '<div class="co-empty-state"><span aria-hidden="true">·</span><p>' + escapeHtml(message) + '</p></div>';
  }

  function publicInsights(publicData) {
    return (Array.isArray(publicData.insights) ? publicData.insights : [])
      .filter(item => item && typeof item.title === 'string' && item.title.trim() && typeof item.url === 'string' && /^https:\/\//.test(item.url))
      .slice()
      .sort((left, right) => String(right.date || '').localeCompare(String(left.date || ''), 'zh-CN'));
  }

  const cardPhotos = {
    methods: ['method-msci', 'method-csa', 'method-ecovadis'],
    news: ['news-standards', 'news-shipping', 'energy'],
    insights: ['research-markets', 'nature', 'city']
  };
  function cardPhoto(group, index = 0) {
    const choices = cardPhotos[group] || cardPhotos.news;
    const key = choices[Math.abs(Number(index) || 0) % choices.length];
    return '<img class="co-card-photo" src="assets/community/card-' + key + '.jpg" alt="" loading="lazy" decoding="async"><i class="co-card-shade" aria-hidden="true"></i>';
  }
  function cardPublisher(item) {
    if (item.org || item.publisher) return String(item.org || item.publisher);
    const facts = (item.content || []).filter(block => block.type === 'facts').flatMap(block => block.items || []);
    const publisher = facts.find(fact => /^(发布机构|发布单位|发布方)$/.test(fact.label));
    return publisher ? String(publisher.value).replace(/[，,]\s*20\d{2}年.*$/, '') : '发布机构未标注';
  }
  function cardCopy(category, publisher, date, title, summary) {
    const meta = [publisher, date].filter(Boolean).join(' · ');
    return '<small class="co-card-category">' + escapeHtml(category) + '</small>'
      + '<div class="co-card-meta" title="' + escapeHtml(meta) + '">' + escapeHtml(meta) + '</div>'
      + '<strong title="' + escapeHtml(title) + '">' + escapeHtml(title) + '</strong>'
      + '<span>' + escapeHtml(summary || '') + '</span>';
  }
  function renderMethod(item, index) {
    const publisher = { msci: 'MSCI', csa: '标普全球', ecovadis: 'EcoVadis' }[item.id] || '';
    return '<a class="co-item co-item--photo" href="' + pageHref('standard.html', { id: item.id }) + '">'
      + cardPhoto('methods', index) + cardCopy(item.type, publisher, '', item.title, item.summary || item.detail) + '</a>';
  }
  function renderInsight(item, index = 0) {
    return '<a class="co-item co-item--ext co-item--photo" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">'
      + cardPhoto('insights', index) + cardCopy(item.category || '研究报告', cardPublisher(item), item.date, item.title, item.summary) + '</a>';
  }
  function renderObservation(item, index = 0) {
    const inner = cardPhoto('news', index) + cardCopy(item.category || '观察', cardPublisher(item), item.date, item.title, item.summary);
    if (item.id) return '<a class="co-item co-observation co-item--photo" href="' + pageHref('observation.html', { id: item.id }) + '">' + inner + '</a>';
    return '<article class="co-item co-observation co-item--photo">' + inner + '</article>';
  }

  function sectionHead(number, icon, title, description) {
    return '<div class="co-section-head"><b>' + number + '</b><span class="co-section-icon">' + svgIcon(icon) + '</span><h2>' + title + '</h2><p>' + description + '</p></div>';
  }

  function reportEntry() {
    return '<section class="co-section co-report-entry" id="co-reports" aria-labelledby="co-reports-title">'
      + '<div class="co-band co-band--reports"><div class="co-band-intro"><div class="co-icon">' + svgIcon('search') + '</div><h3 id="co-reports-title">ESG 报告查询</h3><p>收录A股港股40000+份ESG报告</p></div>'
      + '<div class="co-band-content"><div class="co-band-head"><strong data-report-summary>A股与港股 · 企业报告检索</strong><a class="co-more" href="' + reportPageHref() + '">进入报告库</a></div>'
      + '<div class="co-report-workspace"><div class="co-report-cloud" aria-hidden="true"><span class="co-report-cloud-main">ESG报告</span><span>可持续发展报告</span><span>社会责任报告</span><span>环境、社会及管治报告</span><span>CSR报告</span><span>气候相关披露</span><span>可持续信息披露</span></div>'
      + '<div class="co-report-controls"><form class="co-report-form" id="co-report-form"><label class="co-report-search"><span>' + svgIcon('search') + '</span><input name="q" type="search" placeholder="搜索企业名称、证券代码或报告名称" aria-label="搜索企业名称、证券代码或报告名称"></label>'
      + '<div class="co-report-filters"><select name="industry" aria-label="报告查询行业"><option value="">全部行业</option></select><select name="year" aria-label="报告查询年度"><option value="">全部年度</option><option value="2025">2025年度</option><option value="2024">2024年度</option><option value="2023">2023年度</option><option value="2022">2022年度</option><option value="2021">2021年度</option></select><button type="submit">查询报告</button></div></form>'
      + '<p class="co-report-hint">企业与行业筛选 · 在线查看原文 · 报告清单导出</p></div></div></div></div></section>';
  }

  function renderProjects() {
    const visual = item => item.key === 'workbench'
      ? '<div class="co-tool-visual co-tool-visual--workbench" aria-hidden="true"><div class="co-mini-appbar"><i></i><i></i><i></i><strong>AI×ESG</strong></div><div class="co-mini-workspace"><aside><b></b><i></i><i></i><i></i></aside><main><span>今日工作</span><div><b></b><b></b><b></b></div><p><i></i><i></i><i></i></p></main></div></div>'
      : item.key === 'materiality'
        ? '<div class="co-tool-visual co-tool-visual--materiality" aria-hidden="true"><div class="co-materiality-axis"><span>影响重要性</span><small>财务重要性</small><i></i><i></i><i></i><i></i><i></i><i></i></div></div>'
        : '<div class="co-tool-visual co-tool-visual--todo" aria-hidden="true"><div class="co-todo-board"><div class="co-todo-head"><strong>今日待办</strong><span>3 / 5</span></div><div class="co-todo-progress"><i></i></div><div class="co-todo-row is-done"><b>✓</b><span>整理今日任务</span><small>已完成</small></div><div class="co-todo-row"><b></b><span>复核项目进度</span><small>高优先级</small></div><div class="co-todo-row"><b></b><span>安排下一步</span><small>今天</small></div></div></div>';
    const cards = projectTools.map(item => {
      const tags = item.features.map(feature => '<li>' + escapeHtml(feature) + '</li>').join('');
      const actions = item.help
        ? '<div class="co-tool-actions"><a class="co-tool-primary" href="' + item.help + '" target="_blank" rel="noopener">查看介绍</a><a href="' + item.download + '" target="_blank" rel="noopener noreferrer">下载安装</a></div>'
        : item.tool
          ? '<div class="co-tool-actions co-tool-actions--dual"><a class="co-tool-primary" href="' + pageHref(item.tool) + '">在线版</a>'
            + (item.skillDownload
              ? '<a href="' + escapeHtml(item.skillDownload) + '" target="_blank" rel="noopener noreferrer">Skill 下载</a>'
              : '<span class="co-tool-action-placeholder" aria-disabled="true"><b>Skill 下载</b><small>整理中</small></span>')
            + '</div>'
          : item.repo
            ? '<div class="co-tool-actions co-tool-actions--dual"><a class="co-tool-primary" href="' + escapeHtml(item.repo) + '" target="_blank" rel="noopener noreferrer">获取源码</a>'
              + (item.guide
                ? '<a href="' + escapeHtml(item.guide) + '" target="_blank" rel="noopener noreferrer">部署指南</a>'
                : '')
              + '</div>'
            : '<small class="co-tool-note">' + escapeHtml(item.note || '完善到可体验状态后开放入口') + '</small>';
      return '<article class="co-tool-card co-tool-card--' + item.key + '">' + visual(item)
        + '<div class="co-tool-copy"><div class="co-tool-meta"><small>' + escapeHtml(item.label) + '</small><span>' + escapeHtml(item.status) + '</span></div><h3>' + escapeHtml(item.title) + '</h3><p>' + escapeHtml(item.description) + '</p><ul>' + tags + '</ul>' + actions + '</div></article>';
    }).join('');
    return '<div class="co-projects">' + cards + '</div>';
  }

  function initializeHomeMotion() {
    const root = document.getElementById('community-page');
    if (!root || typeof root.querySelectorAll !== 'function') return;
    const targets = [...root.querySelectorAll('.co-section-head, .co-band, .co-tool-card, .co-about-row, .co-social-area, .co-author-actions')];
    root.classList.add('co-motion-ready');
    targets.forEach((node, index) => {
      node.classList.add('co-motion-item');
      node.style.setProperty('--co-motion-delay', (index % 4) * 70 + 'ms');
    });
    const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || typeof window.IntersectionObserver !== 'function') {
      targets.forEach(node => node.classList.add('is-visible'));
      return;
    }
    const observer = new window.IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    targets.forEach(node => observer.observe(node));
  }
  async function initializeReportEntry() {
    const form = document.getElementById('co-report-form');
    if (!form) return;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = Object.fromEntries([...new FormData(form)].filter(([, value]) => value.trim()));
      location.href = reportPageHref(values);
    });
    let info = localFallbackData.reports;
    if (location.protocol !== 'file:') {
      try { info = await window.ReportCatalogue.manifest(); } catch (_) { /* Use the embedded home-page fallback. */ }
    }
    const summary = document.querySelector('[data-report-summary]');
    if (summary) summary.textContent = info.companyCount.toLocaleString('zh-CN') + ' 家企业 · ' + info.reportCount.toLocaleString('zh-CN') + ' 份报告';
    const industries = [...new Map(info.industryOptions.filter(i => i[1]).map(i => [i[0] + '|1|' + i[1], i])).entries()].sort((a,b) => a[1][0].localeCompare(b[1][0], 'zh') || a[1][1].localeCompare(b[1][1], 'zh'));
    for (const [key, ind] of industries) {
      const option = document.createElement('option');option.value = key;option.textContent = ind[1] + ' · ' + (ind[0] === '申万' ? 'A股' : '港股');form.elements.industry.appendChild(option);
    }
  }

  function render(publicData) {
    const root = document.getElementById('community-page');
    if (!root) return;
    const observations = publicObservations(publicData);
    const recentObservations = observations.slice(0, 3);
    const insights = publicInsights(publicData);
    const recentInsights = insights.slice(0, 3);
    root.innerHTML = '<div class="co-home">'
      + '<header class="co-hero"><button type="button" class="co-join-trigger" data-open-community-join aria-haspopup="dialog" aria-controls="co-join-dialog"><span aria-hidden="true">' + svgIcon('person') + '</span>加入交流群</button><div><span class="co-eyebrow">XIAO〇 · ESG COMMUNITY</span><h2>让知识连接可持续未来</h2><p>一起看懂 ESG 方法，交流工作中的真实问题。<br>知识解读、资讯动态与实践工具，在这里连接。</p><nav class="co-hero-nav" aria-label="探索社区"><a href="#co-reports">查询报告</a><a href="#co-knowledge">学习知识</a><a href="#co-projects">项目与工具</a><a href="#co-about">关于 Xiao〇</a></nav></div></header>'
      + reportEntry()
      + '<section class="co-section" id="co-knowledge">' + sectionHead('01', 'methods', '学习知识', '方法拆解、资讯动态与研究洞察')
      + '<article class="co-band"><div class="co-band-intro"><div class="co-line-art" aria-hidden="true"><svg viewBox="0 0 144 116" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 26q24-10 48 2v57q-24-12-48-2zM68 28q24-12 48-2v57q-24-10-48 0zM30 40l25 2m-25 10 25 2m26-12 24-2m-24 14 24-2"/><path d="M128 30v35m-8-23h16M14 98h116"/><circle cx="130" cy="84" r="7"/></svg></div><h3>方法与知识</h3><p>把评级方法与披露规则拆成可逐页阅读的知识体系。</p></div><div class="co-band-content"><div class="co-band-head"><a class="co-more" href="' + pageHref('index.html') + '">查看更多</a></div><div class="co-items">'
      + standards.slice(0, 3).map(renderMethod).join('')
      + '</div></div></article>'
      + '<article class="co-band co-band--news"><div class="co-band-intro"><div class="co-line-art" aria-hidden="true"><svg viewBox="0 0 144 116" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="20" y="23" width="86" height="68" rx="5"/><path d="M32 36h34m-34 10h22m-22 14h60m-60 11h60m-60 10h40M112 48h18v43H35"/><circle cx="84" cy="43" r="9"/><path d="M119 17v10m-5-5h10M12 103h125"/></svg></div><h3>资讯动态</h3><p>每天更新ESG领域最新进展</p></div><div class="co-band-content"><div class="co-band-head"><a class="co-more" href="' + pageHref('observations.html') + '">查看更多</a></div><div class="co-items co-items--news">'
      + (recentObservations.length ? recentObservations.map(renderObservation).join('') : emptyState('暂未发布观察。'))
      + '</div></div></article>'
      + '<article class="co-band co-band--insights"><div class="co-band-intro"><div class="co-line-art" aria-hidden="true"><svg viewBox="0 0 144 116" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M23 20h64v77H23zM34 34h28m-28 11h38M34 83V67m12 16V58m12 25V64"/><circle cx="94" cy="64" r="23"/><path d="m111 81 21 21M83 65l8-8 9 5 10-13M13 105h75"/></svg></div><h3>研究洞察</h3><p>收录研究机构持续发布的 ESG 研究报告，直达官方页面。</p></div><div class="co-band-content"><div class="co-band-head"><a class="co-more" href="' + pageHref('insights.html') + '">查看更多</a></div><div class="co-items">'
      + (recentInsights.length ? recentInsights.map(renderInsight).join('') : emptyState('暂未收录研究报告。'))
      + '</div></div></article></section>'
      + '<section class="co-section" id="co-projects">' + sectionHead('02', 'ai', '项目与工具', '从真实工作问题出发，逐步做成可直接使用的工具') + renderProjects() + '</section>'
      + '<section class="co-section" id="co-about">' + sectionHead('03', 'person', '关于 Xiao〇', '个人介绍、专业交流与合作') + '<div class="co-about-row"><article class="co-profile"><div class="co-avatar"><img src="assets/community/avatar-xiaoyuan.jpg" alt="Xiao〇卡通头像"></div><h3>你好，我是 Xiao〇</h3><p>ESG 咨询师，也是这个工作台的开发者。我想把复杂的方法拆开，让知识和工具更贴近真实工作。</p><a class="co-action-btn co-action-btn--on-dark co-profile-link" href="' + pageHref('profile.html') + '">进入个人主页</a></article><div>' + renderOffers() + '</div></div>'
      + renderSocial()
      + '<div class="co-author-actions"><button type="button" data-author-like aria-pressed="false">♡ 给作者点赞</button><button type="button" class="co-author-actions--primary" data-open-support>支持作者</button><small class="co-count-status" data-count-status role="status" aria-live="polite"></small></div></section>'
      + '<dialog id="co-join-dialog" class="co-join-dialog" aria-labelledby="co-join-title" aria-describedby="co-join-tip"><div class="co-join-head"><div><small>Xiao〇 ESG社区</small><h3 id="co-join-title">加入交流群</h3></div><button type="button" data-close-community-join aria-label="关闭入群窗口" autofocus>×</button></div><p id="co-join-tip">一起交流 ESG、AI 与工作中的实践。<br>如果二维码过期，请添加微信申请入群。</p><div class="co-join-codes"><section><h4>扫码加入交流群</h4><div class="co-join-qr"><img src="assets/community/qr-wechat-group-20261023.svg" alt="Xiao〇交流群二维码"></div><p>使用微信扫一扫</p></section><section><h4>添加 Xiao〇 微信</h4><div class="co-join-qr co-qr-window co-qr-window--wechat"><img src="assets/community/qr-wechat-source.jpg" alt="Xiao〇个人微信二维码"></div><p>添加时请备注“ESG交流群”</p></section></div></dialog>'
      + '<dialog class="co-support-dialog" id="co-support-dialog"><div class="co-support-head"><div><h3>支持 Xiao〇</h3><p>如果这个项目对你有帮助，可以自愿支持作者继续完善它，请作者喝杯咖啡续命～</p></div><div class="co-support-illustration"><img src="assets/community/gratitude-coffee.png" alt="小圆捧着咖啡说谢谢支持"></div></div><div class="co-support-qr"><img src="assets/community/qr-support-wechat-code.jpg" alt="微信收款码"></div><button type="button" data-close-support>关闭</button></dialog>'
      + '<dialog class="co-form-dialog" id="co-form-dialog" aria-labelledby="co-form-title"><div class="co-form-head"><div><small>飞书表单 · 页面内填写</small><h3 id="co-form-title">联系 Xiao〇</h3></div><button type="button" data-close-community-form aria-label="关闭表单">×</button></div><p class="co-form-intro" data-form-intro></p><div class="co-form-frame"><div class="co-form-loading" data-form-loading>正在打开表单…</div><iframe data-community-form-frame title="飞书表单" referrerpolicy="no-referrer" allow="clipboard-read; clipboard-write"></iframe></div><small class="co-form-foot">提交内容保存在飞书，不会自动显示在社区。请勿填写客户资料。</small></dialog>'
      + '<footer class="co-site-footer co-footer-editorial" aria-label="社区说明"><div class="co-footer-intro"><strong>Xiao〇 ESG社区</strong><p>让知识连接可持续未来。</p></div><div class="co-footer-notes"><section><h4>内容与来源</h4><p>这里分享 ESG 知识、资讯与实践工具，供学习和交流。业务使用请核对官方最新文件；引用资料的权利归原作者，卡片配图为 AI 生成的主题示意。</p></section><section><h4>隐私与反馈</h4><p>浏览与点赞仅用于页面计数，不上传工作台资料。联系表单用于回复与沟通，请勿提交客户或其他敏感信息。</p><button type="button" data-open-community-form="question">内容纠错与反馈</button></section></div><div class="co-footer-bottom"><small>© 2026 Xiao〇 · 原创内容与设计</small><span class="co-view-count" data-community-views aria-live="polite">页面浏览次数读取中…</span></div></footer>'
      + '</div>';
  }

  const obsState = { query: '', page: 1, perPage: 8 };
  let cachedPublicData = {};

  function filteredObservations(publicData) {
    const list = publicObservations(publicData);
    const query = obsState.query.trim().toLowerCase();
    if (!query) return list;
    return list.filter(item =>
      [item.title, item.summary, item.category, item.date].some(field =>
        String(field || '').toLowerCase().includes(query)
      )
    );
  }

  function renderObservationRow(item, index) {
    const category = escapeHtml(item.category || '观察');
    const title = escapeHtml(item.title || '');
    const summary = escapeHtml(item.summary || '');
    const date = escapeHtml(item.date || '');
    const meta = [category, date].filter(Boolean).join(' · ');
    const number = String(index).padStart(2, '0');
    const body = '<span class="co-obs-card-body"><small>' + meta + '</small><strong>' + title + '</strong>'
      + (summary ? '<p>' + summary + '</p>' : '') + '</span>';
    if (item.id) {
      return '<a class="co-observation-row" href="' + pageHref('observation.html', { id: item.id }) + '">'
        + '<span class="co-obs-index">' + number + '</span>' + body + '</a>';
    }
    return '<article class="co-observation-row">' + '<span class="co-obs-index">' + number + '</span>' + body + '</article>';
  }

  function pageNumbers(page, pageCount) {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const pages = [];
    for (let i = 1; i <= pageCount; i++) {
      if (i === 1 || i === pageCount || Math.abs(i - page) <= 1) pages.push(i);
    }
    return pages;
  }

  function renderPagination(page, pageCount, total) {
    if (!total) return '';
    let buttons = '';
    let last = 0;
    pageNumbers(page, pageCount).forEach(number => {
      if (number - last > 1) buttons += '<span class="co-page-ellipsis">…</span>';
      buttons += '<button type="button" class="co-page-btn' + (number === page ? ' is-active' : '') + '" data-page="' + number + '"'
        + (number === page ? ' aria-current="page"' : '') + '>' + number + '</button>';
      last = number;
    });
    return '<nav class="co-pagination" aria-label="观察分页">'
      + '<button type="button" class="co-page-btn' + (page <= 1 ? ' is-disabled' : '') + '" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>上一页</button>'
      + buttons
      + '<button type="button" class="co-page-btn' + (page >= pageCount ? ' is-disabled' : '') + '" data-page="' + (page + 1) + '"' + (page >= pageCount ? ' disabled' : '') + '>下一页</button>'
      + '<span class="co-pagination-total">共 ' + total + ' 条 · 第 ' + page + ' / ' + pageCount + ' 页</span>'
      + '</nav>';
  }

  function renderObservationsContent(publicData) {
    const container = document.getElementById('co-observations-content');
    if (!container) return;
    const filtered = filteredObservations(publicData);
    const pageCount = Math.max(1, Math.ceil(filtered.length / obsState.perPage));
    obsState.page = Math.min(Math.max(1, obsState.page), pageCount);
    const start = (obsState.page - 1) * obsState.perPage;
    const pageItems = filtered.slice(start, start + obsState.perPage);
    const resultCount = obsState.query.trim()
      ? '<p class="co-obs-result-count">搜索“' + escapeHtml(obsState.query.trim()) + '”找到 ' + filtered.length + ' 条</p>'
      : '';
    container.innerHTML = resultCount
      + '<div class="co-observations-list">'
      + (pageItems.length
          ? pageItems.map((item, i) => renderObservationRow(item, start + i + 1)).join('')
          : emptyState('没有找到匹配的观察，换个关键词试试。'))
      + '</div>'
      + renderPagination(obsState.page, pageCount, filtered.length);
  }

  function updateObservationsTotal(publicData) {
    const node = document.querySelector('[data-obs-total]');
    if (!node) return;
    const total = filteredObservations(publicData).length;
    node.textContent = total ? total + ' 条' : '暂无内容';
  }

  function renderObservationsPage(publicData) {
    const root = document.getElementById('observations-page');
    if (!root) return;
    root.innerHTML = '<main class="co-observations-page"><a class="co-observations-back" href="' + pageHref('community.html') + '">返回 Xiao〇 ESG社区</a><header><span class="co-eyebrow">XIAO〇 · OBSERVATIONS</span><h1>资讯动态</h1><p>只收录完成整理、适合公开阅读的内容。</p></header><section><div class="co-observations-head"><h2>全部观察</h2><small data-obs-total>加载中…</small></div><div class="co-observations-toolbar"><span class="co-obs-search-icon">' + svgIcon('search') + '</span><input type="search" data-obs-search placeholder="搜索标题、摘要或分类…" aria-label="搜索观察"><button type="button" class="co-obs-search-clear" data-obs-clear hidden>清除</button></div><div id="co-observations-content"></div></section></main>';
    const search = root.querySelector('[data-obs-search]');
    const clear = root.querySelector('[data-obs-clear]');
    const refresh = () => {
      obsState.query = search ? search.value : '';
      obsState.page = 1;
      if (clear) clear.hidden = !obsState.query;
      renderObservationsContent(publicData);
      updateObservationsTotal(publicData);
    };
    if (search) {
      search.addEventListener('input', refresh);
      search.addEventListener('search', refresh);
    }
    if (clear) {
      clear.addEventListener('click', () => {
        if (search) { search.value = ''; search.focus(); }
        refresh();
      });
    }
    updateObservationsTotal(publicData);
    renderObservationsContent(publicData);
  }

  function observationById(publicData, id) {
    return publicObservations(publicData).find(item => item && item.id === id) || null;
  }

  const insState = { query: '', page: 1, perPage: 12 };

  function filteredInsights(publicData) {
    const list = publicInsights(publicData);
    const query = insState.query.trim().toLowerCase();
    if (!query) return list;
    return list.filter(item =>
      [item.title, item.summary, item.org, item.category, item.date].some(field =>
        String(field || '').toLowerCase().includes(query)
      )
    );
  }

  function renderInsightRow(item, index) {
    const meta = [item.category, item.org, item.date].map(value => String(value || '').trim()).filter(Boolean).map(escapeHtml).join(' · ');
    const number = String(index).padStart(2, '0');
    return '<a class="co-observation-row" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener noreferrer">'
      + '<span class="co-obs-index">' + number + '</span>'
      + '<span class="co-obs-card-body"><small>' + meta + '</small><strong>' + escapeHtml(item.title) + '</strong>'
      + (item.summary ? '<p>' + escapeHtml(item.summary) + '</p>' : '') + '</span></a>';
  }

  function renderInsPagination(page, pageCount, total) {
    if (!total) return '';
    let buttons = '';
    let last = 0;
    pageNumbers(page, pageCount).forEach(number => {
      if (number - last > 1) buttons += '<span class="co-page-ellipsis">…</span>';
      buttons += '<button type="button" class="co-page-btn' + (number === page ? ' is-active' : '') + '" data-page="' + number + '"'
        + (number === page ? ' aria-current="page"' : '') + '>' + number + '</button>';
      last = number;
    });
    return '<nav class="co-pagination" aria-label="研究洞察分页">'
      + '<button type="button" class="co-page-btn' + (page <= 1 ? ' is-disabled' : '') + '" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>上一页</button>'
      + buttons
      + '<button type="button" class="co-page-btn' + (page >= pageCount ? ' is-disabled' : '') + '" data-page="' + (page + 1) + '"' + (page >= pageCount ? ' disabled' : '') + '>下一页</button>'
      + '<span class="co-pagination-total">共 ' + total + ' 条 · 第 ' + page + ' / ' + pageCount + ' 页</span>'
      + '</nav>';
  }

  function renderInsightsContent(publicData) {
    const container = document.getElementById('co-insights-content');
    if (!container) return;
    const filtered = filteredInsights(publicData);
    const pageCount = Math.max(1, Math.ceil(filtered.length / insState.perPage));
    insState.page = Math.min(Math.max(1, insState.page), pageCount);
    const start = (insState.page - 1) * insState.perPage;
    const pageItems = filtered.slice(start, start + insState.perPage);
    const resultCount = insState.query.trim()
      ? '<p class="co-obs-result-count">搜索“' + escapeHtml(insState.query.trim()) + '”找到 ' + filtered.length + ' 条</p>'
      : '';
    container.innerHTML = resultCount
      + '<div class="co-observations-list">'
      + (pageItems.length
          ? pageItems.map((item, i) => renderInsightRow(item, start + i + 1)).join('')
          : emptyState('没有找到匹配的研究报告，换个关键词试试。'))
      + '</div>'
      + renderInsPagination(insState.page, pageCount, filtered.length);
  }

  function updateInsightsTotal(publicData) {
    const node = document.querySelector('[data-ins-total]');
    if (!node) return;
    const total = filteredInsights(publicData).length;
    node.textContent = total ? total + ' 条' : '暂无内容';
  }

  function renderInsightsPage(publicData) {
    const root = document.getElementById('insights-page');
    if (!root) return;
    root.innerHTML = '<main class="co-observations-page"><a class="co-observations-back" href="' + pageHref('community.html') + '">返回 Xiao〇 ESG社区</a><header><span class="co-eyebrow">XIAO〇 · RESEARCH INSIGHTS</span><h1>研究洞察</h1><p>收录研究机构持续发布的 ESG 研究报告，点击直达官方页面。</p></header><section><div class="co-observations-head"><h2>全部收录</h2><small data-ins-total>加载中…</small></div><div class="co-observations-toolbar"><span class="co-obs-search-icon">' + svgIcon('search') + '</span><input type="search" data-ins-search placeholder="搜索机构、报告名或分类…" aria-label="搜索研究洞察"><button type="button" class="co-obs-search-clear" data-ins-clear hidden>清除</button></div><div id="co-insights-content"></div></section></main>';
    const search = root.querySelector('[data-ins-search]');
    const clear = root.querySelector('[data-ins-clear]');
    const refresh = () => {
      insState.query = search ? search.value : '';
      insState.page = 1;
      if (clear) clear.hidden = !insState.query;
      renderInsightsContent(publicData);
      updateInsightsTotal(publicData);
    };
    if (search) {
      search.addEventListener('input', refresh);
      search.addEventListener('search', refresh);
    }
    if (clear) {
      clear.addEventListener('click', () => {
        if (search) { search.value = ''; search.focus(); }
        refresh();
      });
    }
    updateInsightsTotal(publicData);
    renderInsightsContent(publicData);
  }

  function renderObservationBlocks(item) {
    const blocks = Array.isArray(item.content) ? item.content : [];
    return blocks.map(block => {
      const type = block && typeof block.type === 'string' ? block.type : '';
      switch (type) {
        case 'lead':
          return '<p class="co-obs-lead">' + escapeHtml(block.text) + '</p>';
        case 'heading':
          return '<h2 class="co-obs-heading">' + escapeHtml(block.text) + '</h2>';
        case 'facts':
          return '<div class="co-obs-facts">' + (Array.isArray(block.items) ? block.items.map(fact =>
            '<div class="co-obs-fact"><span>' + escapeHtml(fact.label) + '</span><strong>' + escapeHtml(fact.value) + '</strong></div>'
          ).join('') : '') + '</div>';
        case 'timeline':
          return '<ol class="co-obs-timeline">' + (Array.isArray(block.items) ? block.items.map((step, index) =>
            '<li><span class="co-tl-date">' + escapeHtml(step.date) + '</span><span class="co-tl-line" aria-hidden="true"><i>' + (index + 1) + '</i></span><div class="co-tl-copy"><strong>' + escapeHtml(step.title) + '</strong><p>' + escapeHtml(step.detail) + '</p></div></li>'
          ).join('') : '') + '</ol>';
        case 'table':
          return '<div class="co-obs-table-wrap"><table class="co-obs-table"><thead><tr>' + (Array.isArray(block.headers) ? block.headers.map(header => '<th>' + escapeHtml(header) + '</th>').join('') : '') + '</tr></thead><tbody>' + (Array.isArray(block.rows) ? block.rows.map(row =>
            '<tr>' + (Array.isArray(row) ? row.map(cell => '<td>' + escapeHtml(cell) + '</td>').join('') : '<td></td>') + '</tr>'
          ).join('') : '') + '</tbody></table></div>'
            + (block.note ? '<p class="co-obs-table-note">' + escapeHtml(block.note) + '</p>' : '');
        case 'list':
          return '<ul class="co-obs-list">' + (Array.isArray(block.items) ? block.items.map(text => '<li>' + escapeHtml(text) + '</li>').join('') : '') + '</ul>';
        case 'note':
          return '<aside class="co-obs-note">' + escapeHtml(block.text) + '</aside>';
        case 'source':
          return '<p class="co-obs-source">' + escapeHtml(block.label || '来源') + '：<a href="' + escapeHtml(block.url || '#') + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(block.text) + '</a></p>';
        default:
          return '';
      }
    }).join('');
  }

  function renderObservationDetail(publicData) {
    const root = document.getElementById('observation-page');
    if (!root) return;
    const id = new URLSearchParams(location.search).get('id') || '';
    const item = observationById(publicData, id);
    if (!item) {
      root.innerHTML = '<main class="co-observation-page"><a class="co-observation-back" href="' + pageHref('observations.html') + '">返回资讯动态</a>' + emptyState('未找到该资讯，可能已被移除。') + '</main>';
      return;
    }
    const category = escapeHtml(item.category || '观察');
    const title = escapeHtml(item.title || '');
    const summary = escapeHtml(item.summary || '');
    const date = escapeHtml(item.date || '');
    root.innerHTML = '<main class="co-observation-page"><a class="co-observation-back" href="' + pageHref('observations.html') + '">返回资讯动态</a>'
      + '<header class="co-observation-hero"><span class="co-eyebrow">' + category + (date ? ' · ' + date : '') + '</span><h1>' + title + '</h1>'
      + (summary ? '<p>' + summary + '</p>' : '') + '</header>'
      + '<div class="co-obs-body">' + renderObservationBlocks(item) + '</div>'
      + '<footer class="co-observation-foot"><a class="co-observation-back" href="' + pageHref('community.html') + '">返回 Xiao〇 ESG社区</a></footer></main>';
  }

  function notifyHost(page) {
    if (embedded && window.parent !== window) window.parent.postMessage({ type: 'aiesg-community-navigation', page }, '*');
  }

  async function mount() {
    const data = await loadPublicData();
    cachedPublicData = data;
    const isCommunityHome = Boolean(document.getElementById('community-page'));
    if (isCommunityHome) {
      render(data);
      initializeHomeMotion();
      void initializeReportEntry();
      document.querySelector('[data-community-form-frame]')?.addEventListener('load', () => {
        document.querySelector('[data-form-loading]')?.classList.add('loaded');
      });
      void initializeCounters();
      if (new URLSearchParams(location.search).get('open-form') === 'question') {
        document.querySelector('[data-open-community-form="question"]')?.click();
      }
    } else if (document.getElementById('observation-page')) {
      renderObservationDetail(data);
    } else if (document.getElementById('insights-page')) {
      renderInsightsPage(data);
    } else {
      renderObservationsPage(data);
    }
    notifyHost(location.pathname.split('/').pop() || 'community.html');
  }

  document.addEventListener('click', event => {
    const insPageBtn = event.target.closest('#insights-page .co-page-btn');
    if (insPageBtn && !insPageBtn.disabled) {
      const page = Number(insPageBtn.dataset.page);
      if (Number.isFinite(page) && page > 0) {
        insState.page = page;
        renderInsightsContent(cachedPublicData);
        const head = document.querySelector('#insights-page .co-observations-head');
        if (head) head.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      return;
    }
    const pageBtn = event.target.closest('#observations-page .co-page-btn');
    if (pageBtn && !pageBtn.disabled) {
      const page = Number(pageBtn.dataset.page);
      if (Number.isFinite(page) && page > 0) {
        obsState.page = page;
        renderObservationsContent(cachedPublicData);
        const head = document.querySelector('.co-observations-head');
        if (head) head.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      return;
    }
    const internalLink = event.target.closest('#community-page a[href], #observation-page a[href]');
    if (internalLink) {
      const destination = new URL(internalLink.href, location.href);
      if (destination.origin === location.origin && /\.html$/.test(destination.pathname)) notifyHost(destination.pathname.split('/').pop());
    }
    if (event.target.closest('[data-open-community-join]')) {
      document.getElementById('co-join-dialog')?.showModal();
      return;
    }
    if (event.target.closest('[data-close-community-join]')) {
      document.getElementById('co-join-dialog')?.close();
      return;
    }
    if (event.target.id === 'co-join-dialog') {
      const rect = event.target.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.target.close();
      return;
    }
    const formTrigger = event.target.closest('#community-page [data-open-community-form]');
    if (formTrigger) {
      const kind = formTrigger.dataset.openCommunityForm;
      const dialog = document.getElementById('co-form-dialog');
      const frame = dialog?.querySelector('[data-community-form-frame]');
      if (!dialog || !frame || !communityForms[kind]) return;
      const service = formTrigger.dataset.serviceLabel || '';
      const isQuestion = kind === 'question';
      dialog.querySelector('#co-form-title').textContent = isQuestion ? '提出一个问题' : '联系 Xiao〇';
      dialog.querySelector('[data-form-intro]').textContent = isQuestion
        ? '请填写希望讨论的问题。公开展示前会由 Xiao〇 人工筛选、脱敏和整理。'
        : service
          ? '请在表单中选择“' + service + '”，再填写想交流的内容和联系方式。'
          : '请在表单中选择交流方向，填写想交流的问题，并留下微信号、电话或邮箱中的一种。';
      dialog.querySelector('[data-form-loading]').classList.remove('loaded');
      dialog.showModal();
      frame.src = communityForms[kind];
      return;
    }
    const formClose = event.target.closest('#community-page [data-close-community-form]');
    if (formClose) { document.getElementById('co-form-dialog')?.close(); return; }
    if (event.target.id === 'co-form-dialog') { event.target.close(); return; }
    const like = event.target.closest('#community-page [data-author-like]');
    if (like) {
      void recordLike(like);
      return;
    }
    const support = event.target.closest('#community-page [data-open-support]');
    if (support) {
      document.getElementById('co-support-dialog')?.showModal();
      return;
    }
    const close = event.target.closest('#community-page [data-close-support]');
    if (close) {
      document.getElementById('co-support-dialog')?.close();
      return;
    }
    if (event.target.id === 'co-support-dialog') { event.target.close(); return; }
  });

  document.addEventListener('DOMContentLoaded', mount);
  window.CommunityPage = { mount, pageHref, reportPageHref, renderMap, renderQuestion, communityForms, notifyActivity, localFallbackData };
})();
