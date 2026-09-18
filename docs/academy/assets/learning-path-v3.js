(function(){'use strict';
const n=x=>String(x+1).padStart(2,'0');
const escEl=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pickDate=name=>{const m=String(name||'').match(/\d{4}-\d{2}-\d{2}/);return m?m[0]:'';};
/* 标准体系分层：按官方文件真实层级归类（A股/港股），CSA 用 S&P 方法论层级 */
const layers={
 ashare:[
  {layer:'准则基础',note:'财政部企业可持续披露准则体系',match:s=>s.includes('财政部')},
  {layer:'监管统筹',note:'证监会统一规则体系',match:s=>s.includes('证监会')},
  {layer:'规则强制 · 交易所指引',core:true,note:'上市公司可持续发展报告指引（2024-05-01 起实施）',match:s=>s.includes('指引')&&!s.includes('编制指南')},
  {layer:'实施指导 · 编制指南',note:'总体要求与披露框架及应对气候变化、污染物、能源、水资源等应用指南',match:s=>s.includes('编制指南')}
 ],
 hkex:[
  {layer:'规则依据',note:'《上市规则》附录C2《环境、社会及管治报告守则》',match:s=>s.includes('报告守则')},
  {layer:'实施指引',note:'气候信息披露实施指引与 ISSB 标准关联说明',match:s=>s.includes('实施指引')||s.includes('Linking')},
  {layer:'学习入口',note:'港交所 ESG Academy',match:s=>s.includes('ESG Academy')}
 ]
};
const archFallback={
 ashare:[{layer:'规则强制 · 交易所指引',core:true,name:'沪深北三所《上市公司可持续发展报告指引》'},{layer:'实施指导 · 编制指南',name:'三所《可持续发展报告编制指南》'}],
 hkex:[{layer:'规则依据',name:'《上市规则》附录C2 ESG报告守则'},{layer:'实施指引',name:'气候信息披露实施指引 / ISSB 关联说明'}]
};
const pillarCards={
 ashare:[
  {name:'治理',desc:'管理、监督可持续发展相关影响、风险和机遇的治理结构（《指引》第十二条）'},
  {name:'战略',desc:'应对相关影响、风险和机遇的策略与规划'},
  {name:'影响、风险和机遇管理',desc:'识别、评估、监测与管理相关影响、风险和机遇的流程'},
  {name:'指标与目标',desc:'评估和管理相关影响、风险和机遇所用的指标与目标'}
 ],
 hkex:[
  {name:'管治',desc:'监督和管理气候相关风险与机遇的治理流程、控制与程序'},
  {name:'策略',desc:'管理气候相关风险与机遇的策略及纳入整体业务策略的方式'},
  {name:'风险管理',desc:'识别、评估、优先排序和监测气候相关风险的流程'},
  {name:'指标及目标',desc:'评估和管理气候相关风险与机遇的指标与目标'}
 ],
 csa:[
  {name:'治理与经济',desc:'公司治理、商业道德、风险管理与创新等基础性标准'},
  {name:'环境',desc:'气候变化、水资源、生物多样性与循环经济等环境标准'},
  {name:'社会',desc:'人力资本、社区影响、供应链与客户关系等社会标准'}
 ]
};
/* 概念/框架官方条文来源（详情文件） */
const officialSource={
 ashare:{framework:'data/ashare/ashare-framework.json'},
 hkex:{framework:'data/hkex/hkex-cd-3.json'}
};
function firstOfficial(detail){const s=(detail&&detail.sections)||[];for(const sec of s){const b=(sec.blocks||[]).find(x=>x.provenance==='official'||x.provenance==='official_guidance');if(b)return{title:sec.title,text:String(b.content_cn||b.content||'')};}return null;}
window.renderLearningPathV3=function({standard,esc,href}){
 if(!/^(ashare|hkex|csa)$/.test(standard.id||''))return null;
 const groups=standard.groups||[],allItems=groups.flatMap(g=>g.items||[]);
 const files=(standard.officialFiles||[]).map(f=>({name:f.name,url:f.url}));
 /* 标准体系：官方文件按层归类 */
 let archHtml='';
 if(files.length){
  const bucket=layers[standard.id]||[];
  archHtml=bucket.map(layer=>{
   const items=files.filter(f=>layer.match(f.name));
   if(!items.length)return '';
   return `<div class="lp-arch-node${layer.core?' is-core':''}"><span>${esc(layer.layer)}</span><b>${esc(layer.note)}</b>${layer.core?'<i>核心</i>':''}<ul>${items.map(f=>`<li><a href="${esc(f.url)}" target="_blank" rel="noreferrer">${esc(f.name.replace(/（[\d-]{8,10}.*?）?/g,'').slice(0,26))}${f.name.length>26?'…':''}${pickDate(f.name)?` <small>${pickDate(f.name)}</small>`:''}</a></li>`).join('')}</ul></div>`;
  }).join('');
 }else{
  archHtml=(archFallback[standard.id]||[]).map((node,i)=>`<div class="lp-arch-node${node.core?' is-core':''}"><span>${esc(node.layer)}</span><b>${esc(node.name)}</b>${node.core?'<i>核心</i>':''}</div>`).join('');
 }
 /* 关键框架 */
 const pillars=(pillarCards[standard.id]||[]).map((p,i)=>`<article class="lp-pillar"><span>${n(i)}</span><b>${esc(p.name)}</b><p>${esc(p.desc)}</p></article>`).join('');
 /* 重要概念（官方定义异步注入） */
 const concepts=(groups[0]?.items||[]).map(item=>{
  const source=item.detailFile;
  return `<article class="lp-concept" data-detail="${esc(source||'')}"><span>${esc(item.eyebrow||'重要概念')}</span><b>${esc(item.title)}</b><p class="lp-concept-summary">${esc(String(item.summary||'').slice(0,64))}</p><p class="lp-concept-official"></p><a href="${href('topic.html',{standard:standard.id,id:item.id})}">阅读官方条文 →</a></article>`;
 }).join('');
 /* 重要流程：standard.process 横向流程线 */
 const processSteps=(standard.process||[]).map((step,index)=>{
  const match=allItems.find(i=>i.title===step.title);
  return `<div class="lp-flow-node"><span>${n(index)}</span><b>${esc(step.title)}</b><p>${esc(step.description||'')}</p>${match?`<a href="${href('topic.html',{standard:standard.id,id:match.id})}">进入条文 →</a>`:''}</div>`;
 }).join('');
 /* 框架议题：全部分组网格 */
 const issueZones=groups.map((group,gi)=>`<section class="lp-issue-zone" data-zone="${gi}"><header><div><span>${n(gi)} · 议题分类</span><h3>${esc(group.title)}</h3></div><p>${group.items.length} 项议题</p></header><div class="lp-issue-grid">${group.items.map(item=>`<a href="${href('topic.html',{standard:standard.id,id:item.id})}"><span>${esc(item.eyebrow||'议题')}</span><b>${esc(item.title)}</b><p>${esc(String(item.summary||'').slice(0,56))}</p><small>官方条文 →</small></a>`).join('')}</div></section>`).join('');
 return `<div class="lp-page" data-system="${esc(standard.id)}"><main class="lp-main">
 <section class="lp-hero"><div><span class="lp-kicker">${esc(standard.issuer||'')} · ${esc(standard.eyebrow||'')}</span><h1>${esc(standard.title)}</h1><p>${esc(standard.description||'')}</p><div class="lp-meta">${[standard.issuer,standard.version&&`版本 ${standard.version}`,standard.updated&&`更新 ${standard.updated}`].filter(Boolean).map(v=>`<i>${esc(v)}</i>`).join('')}</div></div><aside><small>框架模块</small><strong>${groups.length}</strong><small>议题条目</small><strong>${allItems.length}</strong><small>官方文件</small><strong>${files.length||'—'}</strong></aside></section>
 <section class="lp-block" id="system"><header class="lp-block-head"><div><span>标准体系</span><h2>官方文件层级</h2></div><p>按发布机构与效力分层，核心文件为披露的强制依据。</p></header><div class="lp-arch">${archHtml}</div></section>
 <section class="lp-block" id="concepts"><header class="lp-block-head"><div><span>重要概念</span><h2>${esc(groups[0]?.title||'先掌握这些概念')}</h2></div><p>概念卡直接摘录官方条文；点击进入完整条文与解读。</p></header><div class="lp-concepts">${concepts}</div></section>
 <section class="lp-block" id="framework"><header class="lp-block-head"><div><span>关键框架</span><h2>${standard.id==='csa'?'标准按三个维度组织':'披露内容围绕核心框架展开'}</h2></div><p>${standard.id==='csa'?'行业决定适用问题与相对权重。':'议题条文按框架逐项组织，是阅读具体议题的骨架。'}</p></header><div class="lp-pillars">${pillars}</div><div class="lp-framework-source" data-framework-source="${esc(officialSource[standard.id]?.framework||'')}"></div></section>
 ${processSteps?`<section class="lp-block" id="process"><header class="lp-block-head"><div><span>重要流程</span><h2>披露与评估的主要环节</h2></div><p>按环节顺序执行；每个环节可进入对应官方条文。</p></header><div class="lp-flow">${processSteps}</div></section>`:''}
 <section class="lp-block" id="issues"><header class="lp-block-head"><div><span>框架议题</span><h2>${allItems.length} 项议题 · 按分类浏览</h2></div><p>每项议题含官方条文原文与解读。</p></header>${issueZones}</section>
 <section id="sources" class="lp-sources"><span>官方发布文件</span>${files.length?`<ul class="lp-file-list">${files.map(f=>`<li><a href="${esc(f.url)}" target="_blank" rel="noreferrer">${esc(f.name)} ↗</a></li>`).join('')}</ul>`:'<p>本页基于 S&P Global CSA 方法论公开资料整理。</p>'}<small class="lp-ai-note">学习路径由 AI 按官方文件整理，条文与适用要求以发布机构现行文件为准。</small></section>
 </main></div>`;
};
window.bindLearningPathV3=function(root){
 const inject=async(el,detailFile)=>{if(!detailFile)return;try{const detail=await (await fetch(detailFile)).json();const found=firstOfficial(detail);if(!found)return;const target=el.querySelector('.lp-concept-official');if(target){const text=String(found.text).replace(/<[^>]*>/g,'').replace(/^[^。]*《[^》]*》[^。]*摘录/,'').replace(/^\s+/,'').slice(0,110);target.textContent='条文摘录：'+text+(found.text.length>110?'…':'');}}catch(e){}};
 root.querySelectorAll('.lp-concept[data-detail]').forEach(el=>{const file=el.dataset.detail;if(file)inject(el,file);});
 const frameworkEl=root.querySelector('[data-framework-source]');
 if(frameworkEl&&frameworkEl.dataset.frameworkSource){fetch(frameworkEl.dataset.frameworkSource).then(r=>r.json()).then(detail=>{const found=firstOfficial(detail);if(!found)return;const text=String(found.text).replace(/<[^>]*>/g,'').replace(/^[^。]*《[^》]*》[^。]*摘录/,'').replace(/^\s+/,'');frameworkEl.innerHTML=`<span>核心框架官方条文</span><p>${escEl(text.slice(0,180))}${text.length>180?'…':''}</p><small>${escEl(found.title||'')}</small>`;}).catch(()=>{});}
};})();
