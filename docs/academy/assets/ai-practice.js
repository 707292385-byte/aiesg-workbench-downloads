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
  const top = () => '<nav class="ai-top" aria-label="页面导航"><a href="'+href({},'community.html')+'">← 返回社区</a><a class="ai-brand" href="'+href()+'">Xiao〇 · AI工具与实践</a></nav>';
  const footer = '<footer class="ai-footer">© 2026 Xiao〇社区 · 内容供学习交流，工具能力与使用条件请核对官方说明。</footer>';
  function filtered() {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return data.articles.filter(a => (category==='all'||a.category===category) && words.every(w => [a.title,a.summary,...a.tags].join(' ').toLocaleLowerCase().includes(w)));
  }
  function cards() {
    const articles = filtered();
    document.getElementById('ai-count').textContent = '共 '+articles.length+' 篇内容';
    document.getElementById('ai-results').innerHTML = articles.length ? articles.map(a => {
      const cat = data.categories.find(c=>c.id===a.category);
      return '<a class="ai-card" href="'+href({...listValues(),id:a.id})+'"><div class="ai-card-meta"><span>'+esc(cat.name)+'</span><small>'+esc(a.kind)+'</small></div><h2>'+esc(a.title)+'</h2><p>'+esc(a.summary)+'</p><div class="ai-tags">'+a.tags.map(t=>'<span>'+esc(t)+'</span>').join('')+'</div><span class="ai-read">阅读全文 ↗</span></a>';
    }).join('') : '<div class="ai-empty"><h2>没有找到相关内容</h2><p>试试“飞书”“待办”或“入门”，也可以清除筛选。</p><button type="button" data-clear>清除筛选</button></div>';
  }
  function renderList() {
    document.title = 'AI工具与实践｜Xiao〇社区';
    root.innerHTML = '<div class="ai-shell">'+top()+'<header class="ai-hero"><span class="ai-eyebrow">EXPLORE · UNDERSTAND · PRACTICE</span><h1>AI工具与实践<span>让想法，走进日常工作。</span></h1><p>认识常用工具，理解基础概念，交流一步步做出来的经验。</p></header><div class="ai-paths">'+data.categories.map(c=>'<a href="'+href({category:c.id})+'"><span>'+c.mark+'</span><h2>'+c.name+'</h2><p>'+c.lead+'</p></a>').join('')+'</div><section class="ai-library" aria-label="内容浏览"><div class="ai-library-head"><div><span class="ai-eyebrow">THE NOTEBOOK</span><h2>从这里开始探索</h2></div><label class="ai-search">搜索内容<input id="ai-search" type="search" placeholder="搜索工具、知识或实操主题" value="'+esc(query)+'"></label></div><div class="ai-filter" role="group" aria-label="内容分类">'+[{id:'all',name:'全部内容'},...data.categories].map(c=>'<button type="button" data-category="'+c.id+'" aria-pressed="'+(category===c.id)+'">'+c.name+'</button>').join('')+'</div><p id="ai-count" role="status" aria-live="polite"></p><div id="ai-results" class="ai-grid"></div></section>'+footer+'</div>';
    cards();
  }
  function block(s) {
    return '<section><h2>'+esc(s.heading)+'</h2>'+(s.text?'<p>'+esc(s.text)+'</p>':'')+(s.steps?'<ol>'+s.steps.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol>':'')+(s.prompt?'<div class="ai-prompt"><pre>'+esc(s.prompt)+'</pre><button type="button" data-copy>复制提示词</button><span role="status" aria-live="polite"></span></div>':'')+'</section>';
  }
  function renderDetail(id) {
    const a = data.articles.find(item=>item.id===id);
    if(!a) {
      document.title = '内容未找到｜AI工具与实践';
      root.innerHTML='<div class="ai-shell">'+top()+'<section class="ai-empty"><h1>这篇内容暂时无法找到</h1><p>链接可能已变更，请返回列表继续浏览。</p><a href="'+href(listValues())+'">返回内容列表 →</a></section>'+footer+'</div>';
      return;
    }
    const cat=data.categories.find(c=>c.id===a.category);
    document.title=a.title+'｜AI工具与实践';
    const related=data.articles.filter(item=>item.id!==a.id&&item.tags.some(t=>a.tags.includes(t))).slice(0,3);
    root.innerHTML='<div class="ai-shell">'+top()+'<a class="ai-back" href="'+href(listValues())+'">← 返回内容列表</a><article class="ai-article"><header><div class="ai-card-meta"><a href="'+href({category:a.category})+'">'+esc(cat.name)+'</a><span>'+esc(a.kind)+'</span></div><h1>'+esc(a.title)+'</h1><p class="ai-summary">'+esc(a.summary)+'</p></header>'+(a.kind==='方法示例'?'<aside class="ai-note">这是一份方法示例，用于说明操作思路。具体步骤取决于所用AI工具、连接器与飞书权限；不代表已完成真实账号联调。</aside>':'')+a.sections.map(block).join('')+(a.source?'<section class="ai-source"><h2>参考与官方入口</h2><a href="'+esc(a.source)+'" target="_blank" rel="noopener noreferrer">'+esc(a.sourceName)+' ↗</a>'+(a.verified?'<p>官方来源核对：'+esc(a.verified)+'。具体功能和使用条件以官方当前说明为准。</p>':'')+'</section>':'')+'</article>'+(related.length?'<section class="ai-related"><h2>继续阅读</h2>'+related.map(r=>'<a href="'+href({...listValues(),id:r.id})+'">'+esc(r.title)+' →</a>').join('')+'</section>':'')+footer+'</div>';
  }
  root.addEventListener('input', e => {
    if(e.target.id!=='ai-search')return;
    query=e.target.value; history.replaceState(null,'',href(listValues())); cards();
  });
  root.addEventListener('click',async e => {
    const tab=e.target.closest('[data-category]');
    if(tab) {
      category=tab.dataset.category;
      root.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===tab)));
      history.replaceState(null,'',href(listValues()));cards();return;
    }
    if(e.target.closest('[data-clear]')){category='all';query='';history.replaceState(null,'',href());renderList();document.getElementById('ai-search').focus();return;}
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
