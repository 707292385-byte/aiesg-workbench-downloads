(function () {
  'use strict';

  const communityForms = {
    contact: 'https://my.feishu.cn/share/base/shrcnUKzCwW2jbt1Vi9asLGutEh'
  };
  const iconPaths = {
    methods: '<path d="M4 5.5c2.7-1.2 5.1-1.2 8 0v13c-2.9-1.2-5.3-1.2-8 0z"/><path d="M12 5.5c2.9-1.2 5.3-1.2 8 0v13c-2.7-1.2-5.1-1.2-8 0z"/><path d="M12 5.5v13"/>',
    news: '<path d="M4 17.5h16"/><path d="m5 13 4-4 3 2 6-6"/><path d="M15 5h3v3"/>',
    map: '<path d="m3.5 6 5.7-2.2 5.6 2.2 5.7-2.2v14.4l-5.7 2.2-5.6-2.2-5.7 2.2z"/><path d="M9.2 3.8v14.4M14.8 6v14.4"/>',
    person: '<circle cx="12" cy="8" r="3.2"/><path d="M5.3 20c.6-3.5 3-5.2 6.7-5.2s6.1 1.7 6.7 5.2"/>',
    support: '<path d="M12 3 20 6v6c0 4.8-3 7.9-8 9-5-1.1-8-4.2-8-9V6z"/><path d="m8.5 12 2.4 2.4 4.8-4.8"/>',
    ai: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z"/><path d="m19 17 .6 1.4L21 19l-1.4.6L19 21l-.6-1.4L17 19l1.4-.6z"/>',
    cooperate: '<path d="M3 9.5 7 6l4.2 2.1 3.4-1.5L21 9.5l-6.8 7.2a2 2 0 0 1-2.8.1l-4.7-4.1"/><path d="m9.5 10.2 2.9-2.6"/><path d="m5.7 13.2-2.4-2.5"/><path d="m18.3 13.2 2.4-2.5"/>'
  };
  const svgIcon = name => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + iconPaths[name] + '</svg>';
  const embedded = new URLSearchParams(location.search).get('embed') === '1';
  function pageHref(page, values = {}) {
    const url = new URL(page, location.href);
    Object.entries(values).forEach(([key, value]) => url.searchParams.set(key, value));
    if (embedded) url.searchParams.set('embed', '1');
    return url.pathname.split('/').pop() + url.search;
  }
  const standards = [
    { id: 'msci', type: '评级方法', title: 'MSCI ESG评级方法论', detail: '行业权重 · 关键议题 · 评级流程' },
    { id: 'ashare', type: '披露指引', title: 'A股可持续发展报告', detail: '议题结构 · 披露要求' },
    { id: 'hkex', type: '披露要求', title: '港交所 ESG 披露', detail: '要求理解 · 使用边界' },
    { id: 'csa', type: '评价方法', title: 'CSA 评价方法', detail: '题目结构 · 评分关系' }
  ];
  const starterQuestions = [
    { category: '工作台共创', title: '项目推进时，最需要工作台帮我看清哪一步？', summary: '围绕项目阶段、任务安排与进度提醒。', detail: '哪些节点需要提醒，哪些进度变化值得提前关注？' },
    { category: 'ESG工作难题', title: '理解披露标准时，哪些概念最容易混淆？', summary: '围绕标准原文、定义、关联关系和使用边界。', detail: '一个要求在不同标准中表述不同，应该怎样识别适用边界？' },
    { category: 'AI实践问题', title: 'AI 在资料整理中，怎样保证结果可以核对？', summary: '围绕来源追踪、人工复核与实际工作场景。', detail: '如何让 AI 整理的要点逐条对应到可查证的来源？' }
  ];
  const socialProfiles = [
    { name: '小红书', image: 'assets/community/qr-xiaohongshu-source.jpg', crop: 'xhs' },
    { name: '微信公众号', image: 'assets/community/qr-wechat-official.jpg', crop: 'official' },
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
      + '<div class="co-contact-entry"><div><small>联系 Xiao〇</small><p>请选择联系类别，说明想交流的内容，并留下微信号、电话或邮箱中的一种。</p></div><button type="button" class="co-action-btn" data-open-community-form="contact">打开联系表单 <b aria-hidden="true">↗</b></button></div>';
  }

  function render(publicData) {
    const root = document.getElementById('community-page');
    if (!root) return;
    const questions = Array.isArray(publicData.questions) && publicData.questions.length ? publicData.questions : starterQuestions;
    root.innerHTML = '<div class="co-home">'
      + '<header class="co-hero"><div><span class="co-eyebrow">XIAO〇 · ESG COMMUNITY</span><h2>Xiao〇 ESG社区</h2><p>一起看懂 ESG 方法，交流工作中的真实问题。这里有知识解读、资讯观察，也记录这个工作台如何慢慢做出来。</p><nav class="co-hero-nav" aria-label="社区分区"><a href="#co-knowledge">学习知识</a><a href="#co-community">共创社区</a><a href="#co-about">关于 Xiaoyuan</a></nav></div><div class="co-hero-mark" aria-hidden="true">〇</div></header>'
      + '<section class="co-section" id="co-knowledge"><div class="co-section-head"><b>01</b><h2>学习知识</h2><p>方法拆解与资讯观察</p></div>'
      + '<article class="co-band"><div class="co-band-intro"><div class="co-icon">' + svgIcon('methods') + '</div><h3>方法与知识</h3><p>标准、评级与披露方法的拆解和关联。把复杂原始资料整理成更容易理解和使用的结构。</p></div><div class="co-band-content"><div class="co-band-head"><strong>热门知识目录</strong><a class="co-more" href="' + pageHref('index.html') + '">更多知识　→</a></div><div class="co-items">'
      + standards.map(item => '<a class="co-item" href="' + pageHref('standard.html', { id: item.id }) + '"><small>' + escapeHtml(item.type) + '</small><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.detail) + '</span></a>').join('')
      + '</div></div></article>'
      + '<article class="co-band co-band--news"><div class="co-band-intro"><div class="co-icon">' + svgIcon('news') + '</div><h3>资讯与观察</h3><p>跟进 ESG 方法更新、行业动态与实践问题，关注变化对实际工作的影响。</p></div><div class="co-band-content"><div class="co-band-head"><strong>近期关注</strong><button type="button" data-community-news-more>更多观察　→</button></div><div class="co-items co-items--news"><article class="co-item"><small>方法更新</small><strong>方法论更新如何影响使用？</strong><span>看来源、版本和主要变化</span></article><article class="co-item"><small>实践观察</small><strong>ESG 工作中的新问题</strong><span>把工作难题拆成可讨论的问题</span></article><article class="co-item"><small>开发动态</small><strong>工作台开发手记</strong><span>功能变化与真实使用反馈</span></article><article class="co-item" data-community-news-extra hidden><small>资料核对</small><strong>先找到可信的原件</strong><span>来源核验与内容解读分开</span></article></div></div></article></section>'
      + '<section class="co-section" id="co-community"><div class="co-section-head"><b>02</b><h2>共创社区</h2><p>感谢伙伴，整理大家关心的问题</p></div>'
      + renderMap(publicData)
      + '<div class="co-questions"><div class="co-question-head"><div><h3>大家关注的问题</h3><p>相近提问由 Xiao〇 筛选整理后展示；按同类提问和详情阅读分别看热度。</p></div><button type="button" class="co-action-btn" data-open-community-form="contact" data-service-label="问题反馈">提出一个问题 <b aria-hidden="true">↗</b></button></div><div class="co-question-grid">'
      + questions.map(renderQuestion).join('')
      + '</div></div></section>'
      + '<section class="co-section" id="co-about"><div class="co-section-head"><b>03</b><h2>关于 Xiao〇</h2><p>个人介绍、专业交流与合作</p></div><div class="co-about-row"><article class="co-profile"><div class="co-avatar"><img src="assets/community/avatar-xiaoyuan.jpg" alt="Xiao〇卡通头像"></div><h3>你好，我是 Xiao〇</h3><p>ESG 咨询师，也是这个工作台的开发者。我想把复杂的方法拆开，让知识和工具更贴近真实工作。</p><a class="co-action-btn co-action-btn--on-dark co-profile-link" href="' + pageHref('profile.html') + '">进入个人主页 <b aria-hidden="true">↗</b></a></article><div>' + renderOffers() + '</div></div>'
      + renderSocial()
      + '<div class="co-author-actions"><button type="button" data-author-like aria-pressed="false">♡ 给作者点赞</button><button type="button" class="co-author-actions--primary" data-open-support>支持作者　→</button></div></section>'
      + '<dialog class="co-support-dialog" id="co-support-dialog"><div class="co-support-head"><div><h3>支持 Xiao〇</h3><p>如果这个项目对你有帮助，可以自愿支持作者继续完善它，或者请作者喝杯咖啡续命～</p></div><div class="co-support-illustration"><img src="assets/community/gratitude-coffee.png" alt="小圆捧着咖啡说谢谢支持"></div></div><div class="co-support-qr"><img src="assets/community/qr-support-wechat-code.jpg" alt="微信收款码"></div><button type="button" data-close-support>关闭</button></dialog>'
      + '<dialog class="co-form-dialog" id="co-form-dialog" aria-labelledby="co-form-title"><div class="co-form-head"><div><small>飞书表单 · 页面内填写</small><h3 id="co-form-title">联系 Xiao〇</h3></div><button type="button" data-close-community-form aria-label="关闭表单">×</button></div><p class="co-form-intro" data-form-intro></p><div class="co-form-frame"><div class="co-form-loading" data-form-loading>正在打开表单…</div><iframe data-community-form-frame title="飞书表单" referrerpolicy="no-referrer" allow="clipboard-read; clipboard-write"></iframe></div><small class="co-form-foot">提交内容保存在飞书，不会自动显示在社区。请勿填写客户资料。</small></dialog>'
      + '<footer class="co-site-footer" aria-label="社区说明"><div><small>社区内容在线更新 · © 2026 Xiao〇</small><small><strong>版权声明：</strong>原创解读与页面设计归 Xiao〇；引用资料归原作者。</small></div><div><small><strong>信息声明：</strong>内容按公开资料整理，以官方现行文件为准；联系方式仅用于回复。</small><small><strong>免责声明：</strong>个人测试项目可能有未知问题；请用非工作电脑及脱敏资料体验，重要判断自行核对。</small></div></footer>'
      + '</div>';
  }

  function notifyHost(page) {
    if (embedded && window.parent !== window) window.parent.postMessage({ type: 'aiesg-community-navigation', page }, '*');
  }

  async function mount() {
    const data = await loadPublicData();
    render(data);
    document.querySelector('[data-community-form-frame]')?.addEventListener('load', () => {
      document.querySelector('[data-form-loading]')?.classList.add('loaded');
    });
    notifyHost('community.html');
    if (new URLSearchParams(location.search).get('open-form') === 'question') {
      document.querySelector('[data-open-community-form="contact"]')?.click();
    }
  }

  document.addEventListener('click', event => {
    const internalLink = event.target.closest('#community-page a[href]');
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
      dialog.querySelector('#co-form-title').textContent = '联系 Xiao〇';
      dialog.querySelector('[data-form-intro]').textContent = service
        ? '请在表单中选择“' + service + '”，再填写想交流的内容和联系方式。'
        : '请在表单中选择联系类别，填写想交流的内容，并留下微信号、电话或邮箱中的一种。';
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
      const liked = like.getAttribute('aria-pressed') === 'true';
      like.setAttribute('aria-pressed', String(!liked));
      like.textContent = liked ? '♡ 给作者点赞' : '♥ 已点赞';
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
    const news = event.target.closest('#community-page [data-community-news-more]');
    if (news) {
      const extra = document.querySelector('#community-page [data-community-news-extra]');
      if (extra) { extra.hidden = !extra.hidden; news.textContent = extra.hidden ? '更多观察　→' : '收起观察　↑'; }
      return;
    }
  });

  document.addEventListener('DOMContentLoaded', mount);
  window.CommunityPage = { mount, pageHref, renderMap, renderQuestion, communityForms };
})();
