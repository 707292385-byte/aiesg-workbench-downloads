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
  const standards = [
    { id: 'msci', type: '评级方法', title: 'MSCI ESG评级方法论', detail: '行业权重 · 关键议题 · 评级流程' }
  ];

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
    try {
      const response = await fetch('assets/community-public.json', { cache: 'no-store' });
      if (response.ok) return await response.json();
    } catch (_) {}
    return {};
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
      + '<div class="co-contact-entry"><div><small>联系 Xiao〇</small><p>选择交流方向，说明想交流的问题，并留下微信号、电话或邮箱中的一种。</p></div><button type="button" class="co-action-btn" data-open-community-form="contact">打开联系表单 <b aria-hidden="true">↗</b></button></div>';
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

  function renderObservation(item) {
    const category = escapeHtml(item.category || '观察');
    const title = escapeHtml(item.title || '');
    const summary = escapeHtml(item.summary || '');
    const date = escapeHtml(item.date || '');
    const meta = [category, date].filter(Boolean).join(' · ');
    const inner = '<small>' + meta + '</small><strong>' + title + '</strong>'
      + (summary ? '<span>' + summary + '</span>' : '');
    if (item.id) {
      return '<a class="co-item co-observation" href="' + pageHref('observation.html', { id: item.id }) + '">' + inner + '</a>';
    }
    return '<article class="co-item co-observation">' + inner + '</article>';
  }

  function sectionHead(number, icon, title, description) {
    return '<div class="co-section-head"><b>' + number + '</b><span class="co-section-icon">' + svgIcon(icon) + '</span><h2>' + title + '</h2><p>' + description + '</p></div>';
  }

  function render(publicData) {
    const root = document.getElementById('community-page');
    if (!root) return;
    const questions = publicQuestions(publicData);
    const observations = publicObservations(publicData);
    const recentObservations = observations.slice(0, 6);
    root.innerHTML = '<div class="co-home">'
      + '<header class="co-hero"><div><span class="co-eyebrow">XIAO〇 · ESG COMMUNITY</span><h2>Xiao〇 ESG社区</h2><p>一起看懂 ESG 方法，交流工作中的真实问题。这里有知识解读、资讯观察，也记录这个工作台如何慢慢做出来。</p><nav class="co-hero-nav" aria-label="社区分区"><a href="#co-knowledge"><span>' + svgIcon('methods') + '</span>学习知识</a><a href="#co-community"><span>' + svgIcon('map') + '</span>共创社区</a><a href="#co-about"><span>' + svgIcon('person') + '</span>关于 Xiao〇</a></nav><div class="co-hero-meta"><small>社区内容在线更新</small><span class="co-view-count" data-community-views aria-live="polite">页面浏览次数读取中…</span></div></div><div class="co-hero-mark" aria-hidden="true">〇</div></header>'
      + '<section class="co-section" id="co-knowledge">' + sectionHead('01', 'methods', '学习知识', '方法拆解与资讯观察')
      + '<article class="co-band"><div class="co-band-intro"><div class="co-icon">' + svgIcon('methods') + '</div><h3>方法与知识</h3><p>已发布的内容以核验完成的原始资料为依据，其他标准内容将在完成整理后陆续开放。</p></div><div class="co-band-content"><div class="co-band-head"><strong>已发布</strong></div><div class="co-items">'
      + standards.map(item => '<a class="co-item" href="' + pageHref('standard.html', { id: item.id }) + '"><small>' + escapeHtml(item.type) + '</small><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.detail) + '</span></a>').join('')
      + '</div><div class="co-inline-empty">其他方法与知识内容整理中。</div></div></article>'
      + '<article class="co-band co-band--news"><div class="co-band-intro"><div class="co-icon">' + svgIcon('news') + '</div><h3>资讯与观察</h3><p>只展示已经完成整理并准备公开的内容；新的观察会在这里持续更新。</p></div><div class="co-band-content"><div class="co-band-head"><strong>近期关注</strong><a class="co-more" href="' + pageHref('observations.html') + '">更多观察　→</a></div><div class="co-items co-items--news">'
      + (recentObservations.length ? recentObservations.map(renderObservation).join('') : emptyState('暂未发布观察。'))
      + '</div></div></article></section>'
      + '<section class="co-section" id="co-community">' + sectionHead('02', 'map', '共创社区', '感谢伙伴，整理大家关心的问题')
      + renderMap(publicData)
      + '<div class="co-questions"><div class="co-question-head"><div><h3>大家关注的问题</h3><p>只展示完成整理、适合公开讨论的内容。</p></div><button type="button" class="co-action-btn" data-open-community-form="question">提出一个问题 <b aria-hidden="true">↗</b></button></div><div class="co-question-grid">'
      + (questions.length ? questions.map(renderQuestion).join('') : emptyState('暂未公开问题。'))
      + '</div></div></section>'
      + '<section class="co-section" id="co-about">' + sectionHead('03', 'person', '关于 Xiao〇', '个人介绍、专业交流与合作') + '<div class="co-about-row"><article class="co-profile"><div class="co-avatar"><img src="assets/community/avatar-xiaoyuan.jpg" alt="Xiao〇卡通头像"></div><h3>你好，我是 Xiao〇</h3><p>ESG 咨询师，也是这个工作台的开发者。我想把复杂的方法拆开，让知识和工具更贴近真实工作。</p><a class="co-action-btn co-action-btn--on-dark co-profile-link" href="' + pageHref('profile.html') + '">进入个人主页 <b aria-hidden="true">↗</b></a></article><div>' + renderOffers() + '</div></div>'
      + renderSocial()
      + '<div class="co-author-actions"><button type="button" data-author-like aria-pressed="false">♡ 给作者点赞</button><button type="button" class="co-author-actions--primary" data-open-support>支持作者　→</button><small class="co-count-status" data-count-status role="status" aria-live="polite"></small></div></section>'
      + '<dialog class="co-support-dialog" id="co-support-dialog"><div class="co-support-head"><div><h3>支持 Xiao〇</h3><p>如果这个项目对你有帮助，可以自愿支持作者继续完善它，请作者喝杯咖啡续命～</p></div><div class="co-support-illustration"><img src="assets/community/gratitude-coffee.png" alt="小圆捧着咖啡说谢谢支持"></div></div><div class="co-support-qr"><img src="assets/community/qr-support-wechat-code.jpg" alt="微信收款码"></div><button type="button" data-close-support>关闭</button></dialog>'
      + '<dialog class="co-form-dialog" id="co-form-dialog" aria-labelledby="co-form-title"><div class="co-form-head"><div><small>飞书表单 · 页面内填写</small><h3 id="co-form-title">联系 Xiao〇</h3></div><button type="button" data-close-community-form aria-label="关闭表单">×</button></div><p class="co-form-intro" data-form-intro></p><div class="co-form-frame"><div class="co-form-loading" data-form-loading>正在打开表单…</div><iframe data-community-form-frame title="飞书表单" referrerpolicy="no-referrer" allow="clipboard-read; clipboard-write"></iframe></div><small class="co-form-foot">提交内容保存在飞书，不会自动显示在社区。请勿填写客户资料。</small></dialog>'
      + '<footer class="co-site-footer" aria-label="社区说明"><div><small>社区内容在线更新 · © 2026 Xiao〇</small><small>版权声明：原创解读与页面设计归 Xiao〇；引用资料归原作者。</small></div><div><small>信息与隐私：内容按公开资料整理，以官方现行文件为准；浏览和作者点赞只上传计数事件，不上传工作台资料；联系表单用于回复。</small><small>免责声明：个人测试项目可能有未知问题；请用非工作电脑及脱敏资料体验，重要判断自行核对。</small></div></footer>'
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
    const arrow = '<span class="co-obs-card-arrow" aria-hidden="true">↗</span>';
    const body = '<span class="co-obs-card-body"><small>' + meta + '</small><strong>' + title + '</strong>'
      + (summary ? '<p>' + summary + '</p>' : '') + '</span>';
    if (item.id) {
      return '<a class="co-observation-row" href="' + pageHref('observation.html', { id: item.id }) + '">'
        + '<span class="co-obs-index">' + number + '</span>' + body + arrow + '</a>';
    }
    return '<article class="co-observation-row">' + '<span class="co-obs-index">' + number + '</span>' + body + arrow + '</article>';
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
      + '<button type="button" class="co-page-btn' + (page <= 1 ? ' is-disabled' : '') + '" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') + '>← 上一页</button>'
      + buttons
      + '<button type="button" class="co-page-btn' + (page >= pageCount ? ' is-disabled' : '') + '" data-page="' + (page + 1) + '"' + (page >= pageCount ? ' disabled' : '') + '>下一页 →</button>'
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
    root.innerHTML = '<main class="co-observations-page"><a class="co-observations-back" href="' + pageHref('community.html') + '">← 返回 Xiao〇 ESG社区</a><header><span class="co-eyebrow">XIAO〇 · OBSERVATIONS</span><h1>资讯与观察</h1><p>只收录完成整理、适合公开阅读的内容。</p></header><section><div class="co-observations-head"><h2>全部观察</h2><small data-obs-total>加载中…</small></div><div class="co-observations-toolbar"><span class="co-obs-search-icon">' + svgIcon('search') + '</span><input type="search" data-obs-search placeholder="搜索标题、摘要或分类…" aria-label="搜索观察"><button type="button" class="co-obs-search-clear" data-obs-clear hidden>清除</button></div><div id="co-observations-content"></div></section></main>';
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
      root.innerHTML = '<main class="co-observation-page"><a class="co-observation-back" href="' + pageHref('observations.html') + '">← 返回资讯与观察</a>' + emptyState('未找到该资讯，可能已被移除。') + '</main>';
      return;
    }
    const category = escapeHtml(item.category || '观察');
    const title = escapeHtml(item.title || '');
    const summary = escapeHtml(item.summary || '');
    const date = escapeHtml(item.date || '');
    root.innerHTML = '<main class="co-observation-page"><a class="co-observation-back" href="' + pageHref('observations.html') + '">← 返回资讯与观察</a>'
      + '<header class="co-observation-hero"><span class="co-eyebrow">' + category + (date ? ' · ' + date : '') + '</span><h1>' + title + '</h1>'
      + (summary ? '<p>' + summary + '</p>' : '') + '</header>'
      + '<div class="co-obs-body">' + renderObservationBlocks(item) + '</div>'
      + '<footer class="co-observation-foot"><a class="co-observation-back" href="' + pageHref('community.html') + '">← 返回 Xiao〇 ESG社区</a></footer></main>';
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
      document.querySelector('[data-community-form-frame]')?.addEventListener('load', () => {
        document.querySelector('[data-form-loading]')?.classList.add('loaded');
      });
      void initializeCounters();
      if (new URLSearchParams(location.search).get('open-form') === 'question') {
        document.querySelector('[data-open-community-form="question"]')?.click();
      }
    } else if (document.getElementById('observation-page')) {
      renderObservationDetail(data);
    } else {
      renderObservationsPage(data);
    }
    notifyHost(location.pathname.split('/').pop() || 'community.html');
  }

  document.addEventListener('click', event => {
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
  window.CommunityPage = { mount, pageHref, renderMap, renderQuestion, communityForms, notifyActivity };
})();
