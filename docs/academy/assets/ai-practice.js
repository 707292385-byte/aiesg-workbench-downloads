(function () {
  'use strict';
  const data = window.AIPracticeData;
  const root = document.getElementById('ai-page');
  if (!data || !root) return;
  const params = new URLSearchParams(location.search);
  const embedded = params.get('embed') === '1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validCategories = new Set(data.categories.map(c => c.id));
  let category = validCategories.has(params.get('category')) ? params.get('category') : 'all';
  let query = params.get('q') || '';
  const seriesState = {};
  function href(values = {}, page = 'ai.html') {
    const p = new URLSearchParams();
    if (embedded) p.set('embed', '1');
    Object.entries(values).forEach(([k,v]) => {if(v) p.set(k,v);});
    return page + (p.size ? '?' + p : '');
  }
  function listValues() { return {category: category === 'all' ? '' : category, q: query}; }
  function notify() {
    if(embedded && window.parent !== window) window.parent.postMessage({type:'aiesg-community-navigation',page:'ai.html'}, '*');
  }
  let lastActivity = 0;
  ['pointerdown','keydown','scroll','touchstart'].forEach(name => document.addEventListener(name, () => {
    const now = Date.now();
    if (embedded && window.parent !== window && now-lastActivity > 5000) {
      lastActivity = now;
      window.parent.postMessage({type:'aiesg:community-activity'}, '*');
    }
  }, {passive:true,capture:true}));
  const top = () => '<nav class="ai-top" aria-label="页面导航"><a href="'+href({},'community.html')+'">← 返回社区</a><a class="ai-brand" href="'+href()+'">Xiao〇 · AI入门与实践</a></nav>';
  const footer = '<footer class="ai-footer">© 2026 Xiao〇社区</footer>';
  function filtered() {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return data.articles.filter(a => (category==='all'||a.category===category) && words.every(w => [a.title,a.summary,a.series,a.platform,...a.tags].filter(Boolean).join(' ').toLocaleLowerCase().includes(w)));
  }
  function references(a) {
    if (Array.isArray(a.links)) return a.links;
    return a.source ? [{label:a.sourceName || '官方入口',url:a.source}] : [];
  }
  function paneBody(a) {
    const refs=references(a);
    return '<div class="ai-series-pane-head"><h3>'+esc(a.title)+'</h3><p>'+esc(a.summary)+'</p><a class="ai-series-open" href="'+href({id:a.id})+'">在单独页面打开 →</a></div>'
      + a.sections.map(block).join('');
  }
  function seriesCard(list, ordinal) {
    const cat = data.categories.find(c=>c.id===list[0].category);
    const seriesName = list[0].series;
    if (!seriesState[seriesName] || !list.some(a=>a.id===seriesState[seriesName])) seriesState[seriesName]=list[0].id;
    const selected = list.find(a=>a.id===seriesState[seriesName]);
    const tone = String(selected.tone || selected.category).replace(/[^a-z0-9-]/gi,'');
    const nav = '<nav class="ai-series-nav" aria-label="'+esc(seriesName)+' 目录"><strong>'+esc(seriesName)+'</strong>'+list.map(a=>'<button type="button" data-series-tab data-series="'+esc(seriesName)+'" data-article="'+esc(a.id)+'" aria-current="'+(a.id===selected.id)+'"><span>'+esc(a.mark||'')+'</span>'+esc(a.cardTitle||a.title)+'</button>').join('')+'</nav>';
    const pane = '<div class="ai-series-pane">'+paneBody(selected)+'</div>';
    return '<article class="ai-card ai-card--series ai-card--'+esc(list[0].category)+' ai-card--'+esc(tone)+'">'
      +'<div class="ai-card-visual"><div class="ai-card-visual-head"><span>'+esc(cat.name)+'</span><small>'+list.length+' 篇 · 系列内容</small></div><strong>'+String(ordinal).padStart(2,'0')+'</strong><p>'+esc(seriesName)+'</p></div>'
      +'<div class="ai-series">'+nav+pane+'</div></article>';
  }
  function cards() {
    const articles = filtered();
    document.getElementById('ai-count').textContent = '共 '+articles.length+' 篇内容';
    const groups = new Map();
    articles.forEach(a => { if (a.series) { if(!groups.has(a.series)) groups.set(a.series, []); groups.get(a.series).push(a); } });
    const emitted = new Set();
    let ordinal = 0;
    const html = articles.length ? articles.map(a => {
      if (a.series) {
        if (emitted.has(a.series)) return '';
        emitted.add(a.series);
        ordinal += 1;
        return seriesCard(groups.get(a.series), ordinal);
      }
      const cat = data.categories.find(c=>c.id===a.category);
      const refs = references(a);
      const tone = String(a.tone || a.category).replace(/[^a-z0-9-]/gi,'');
      const descriptor = a.series || a.platform || a.kind;
      return '<article class="ai-card ai-card--'+esc(a.category)+' ai-card--'+esc(tone)+'">'
        +'<div class="ai-card-visual"><div class="ai-card-visual-head"><span>'+esc(cat.name)+'</span><small>'+esc(a.kind)+'</small></div><strong>'+esc(a.mark || cat.mark)+'</strong><p>'+esc(descriptor)+'</p></div>'
        +'<div class="ai-card-body"><a class="ai-card-main" href="'+href({...listValues(),id:a.id})+'"><h2>'+esc(a.cardTitle || a.title)+'</h2></a><p class="ai-card-summary">'+esc(a.summary)+'</p><div class="ai-tags">'+a.tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div>'
        +'<div class="ai-card-actions"><span class="ai-card-read">查看介绍</span>'+(a.category==='tools'&&refs[0]?'<a class="ai-card-official" href="'+esc(refs[0].url)+'" target="_blank" rel="noopener noreferrer">'+esc(refs[0].label)+'</a>':'')+'</div></div></article>';
    }).join('') : '<div class="ai-empty"><h2>没有找到相关内容</h2><p>试试“飞书”“待办”或“入门”，也可以清除筛选。</p><button type="button" data-clear>清除筛选</button></div>';
    document.getElementById('ai-results').innerHTML = html;
  }
  function renderList() {
    document.title = 'AI入门与实践｜Xiao〇社区';
    const active = data.categories.find(item => item.id === category);
    const heading = active ? active.name : '全部内容';
    const lead = active ? active.lead : '按工具、基础知识和实操经验浏览全部内容。';
    root.innerHTML = '<div class="ai-shell">'+top()+'<header class="ai-hero"><span class="ai-eyebrow">EXPLORE · UNDERSTAND · PRACTICE</span><h1>AI入门与实践<span>让想法，走进日常工作。</span></h1><p>认识常用工具，理解基础概念，交流一步步做出来的经验。</p></header><section class="ai-library" aria-label="内容浏览"><div class="ai-library-head"><div><span class="ai-eyebrow">THE NOTEBOOK</span><h2>'+esc(heading)+'</h2><p class="ai-library-lead">'+esc(lead)+'</p></div><label class="ai-search">搜索内容<input id="ai-search" type="search" placeholder="搜索工具、知识或实操主题" value="'+esc(query)+'"></label></div><div class="ai-filter" role="group" aria-label="内容分类">'+[{id:'all',name:'全部内容'},...data.categories].map(c=>'<button type="button" data-category="'+c.id+'" aria-pressed="'+(category===c.id)+'">'+c.name+'</button>').join('')+'</div><p id="ai-count" role="status" aria-live="polite"></p><div id="ai-results" class="ai-grid"></div></section>'+footer+'</div>';
    cards();
  }
  function block(s) {
    const cards=s.cards?'<div class="ai-scenario-grid">'+s.cards.map(card=>'<article><h3>'+esc(card.title)+'</h3><p>'+esc(card.text)+'</p></article>').join('')+'</div>':'';
    const actions=s.actions?'<div class="ai-section-actions">'+s.actions.map(action=>'<a href="'+esc(action.url)+'" target="_blank" rel="noopener noreferrer">'+esc(action.label)+'</a>').join('')+'</div>':'';
    const contact=s.contactQr?'<div class="ai-contact-qr"><button type="button" data-contact-qr aria-expanded="false">'+esc(s.contactQr.label)+'</button><div class="ai-contact-popover" role="tooltip"><div class="ai-contact-qr-frame"><img src="'+esc(s.contactQr.image)+'" alt="'+esc(s.contactQr.alt)+'"></div><strong>'+esc(s.contactQr.caption)+'</strong><small>咨询注册、套餐选择与会员开通</small></div></div>':'';
    const figure=s.image?'<figure class="ai-knowledge-code"><img src="'+esc(s.image.src)+'" alt="'+esc(s.image.alt)+'"><figcaption>'+esc(s.image.caption)+'</figcaption></figure>':'';
    return '<section>'+(s.heading?'<h2>'+esc(s.heading)+'</h2>':'')+(s.text?'<p>'+esc(s.text)+'</p>':'')+cards+(s.steps?'<ol>'+s.steps.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol>':'')+actions+contact+figure+(s.prompt?'<div class="ai-prompt"><pre>'+esc(s.prompt)+'</pre><button type="button" data-copy>复制提示词</button><span role="status" aria-live="polite"></span></div>':'')+'</section>';
  }
  function renderDetail(id) {
    const a = data.articles.find(item=>item.id===id || (Array.isArray(item.aliases) && item.aliases.includes(id)));
    if(!a) {
      document.title = '内容未找到｜AI入门与实践';
      root.innerHTML='<div class="ai-shell">'+top()+'<section class="ai-empty"><h1>这篇内容暂时无法找到</h1><p>链接可能已变更，请返回列表继续浏览。</p><a href="'+href(listValues())+'">返回内容列表 →</a></section>'+footer+'</div>';
      return;
    }
    const cat=data.categories.find(c=>c.id===a.category);
    document.title=a.title+'｜AI入门与实践';
    const related=data.articles.filter(item=>item.id!==a.id&&item.tags.some(t=>a.tags.includes(t))).slice(0,3);
    const refs=references(a);
    root.innerHTML='<div class="ai-shell">'+top()+'<a class="ai-back" href="'+href(listValues())+'">← 返回内容列表</a><article class="ai-article ai-article--'+esc(a.category)+'"><header><div class="ai-card-meta"><a href="'+href({category:a.category})+'">'+esc(cat.name)+'</a><span>'+esc(a.series || a.kind)+'</span></div><h1>'+esc(a.title)+'</h1><p class="ai-summary">'+esc(a.summary)+'</p></header>'+a.sections.map(block).join('')+(refs.length?'<section class="ai-source"><h2>参考与官方入口</h2><div class="ai-source-actions">'+refs.map((ref,index)=>'<a class="'+(index===0?'is-primary':'')+'" href="'+esc(ref.url)+'" target="_blank" rel="noopener noreferrer">'+esc(ref.label)+'</a>').join('')+'</div></section>':'')+'</article>'+(related.length?'<section class="ai-related ai-related--'+esc(a.category)+'"><h2>继续阅读</h2>'+related.map(r=>'<a href="'+href({...listValues(),id:r.id})+'">'+esc(r.title)+' →</a>').join('')+'</section>':'')+footer+'</div>';
  }
  root.addEventListener('input', e => {
    if(e.target.id!=='ai-search')return;
    query=e.target.value; history.replaceState(null,'',href(listValues())); cards();
  });
  document.addEventListener('click',e=>{
    if(e.target.closest('.ai-contact-qr'))return;
    root.querySelectorAll('[data-contact-qr][aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));
  });
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    root.querySelectorAll('[data-contact-qr][aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));
  });
  root.addEventListener('click',async e => {
    const tab=e.target.closest('[data-category]');
    if(tab) {
      category=tab.dataset.category;
      root.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===tab)));
      history.replaceState(null,'',href(listValues()));cards();return;
    }
    const seriesTab=e.target.closest('[data-series-tab]');
    if(seriesTab) {
      const seriesName=seriesTab.dataset.series;
      const article=data.articles.find(x=>x.id===seriesTab.dataset.article);
      if(!article||article.series!==seriesName)return;
      seriesState[seriesName]=article.id;
      const card=seriesTab.closest('.ai-card--series');
      card.querySelectorAll('[data-series-tab]').forEach(b=>b.setAttribute('aria-current',String(b===seriesTab)));
      const pane=card.querySelector('.ai-series-pane');
      if(pane) pane.innerHTML=paneBody(article);
      return;
    }
    if(e.target.closest('[data-clear]')){category='all';query='';history.replaceState(null,'',href());renderList();document.getElementById('ai-search').focus();return;}
    const contactQr=e.target.closest('[data-contact-qr]');
    if(contactQr){
      const expanded=contactQr.getAttribute('aria-expanded')==='true';
      root.querySelectorAll('[data-contact-qr][aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));
      contactQr.setAttribute('aria-expanded',String(!expanded));return;
    }
    const copy=e.target.closest('[data-copy]');
    if(copy){
      const status=copy.parentElement.querySelector('[role=status]');
      try{await navigator.clipboard.writeText(copy.parentElement.querySelector('pre').textContent);status.textContent='已复制';}catch{status.textContent='请选中上方文字手动复制';}
    }
  });
  window.addEventListener('popstate',()=>location.reload());
  if(params.has('id'))renderDetail(params.get('id'));else renderList();
  notify();
})();
