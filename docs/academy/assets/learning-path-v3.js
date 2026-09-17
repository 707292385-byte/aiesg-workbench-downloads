(function(){'use strict';
const routes={
 ashare:{name:'A股报告编制',type:'政策监管 · 学习路径',lead:'从适用判断到报告复核，把可持续发展报告编制成一条可执行的工作路线。',start:'首次编制从“适用与版本”开始；正在写报告可直接进入“议题与证据”。',source:'沪、深、北交易所可持续发展报告指引及编制指南。',steps:[
  ['适用与版本','确认交易所、报告期与适用文件。','得到适用规则清单',['ashare-framework']],
  ['议题判断','用双重重要性确定需要回应的议题。','得到议题清单与判断依据',['ashare-materiality','ashare-due-diligence','ashare-stakeholder']],
  ['披露架构','为重要议题建立治理、战略、管理、指标与目标的表达结构。','得到议题披露框架',['ashare-framework','ashare-governance']],
  ['议题与证据','按环境、社会、治理议题准备数据、材料和责任。','得到可追溯证据包',[]],
  ['编制与复核','组织写作、交叉检查与版本复核。','得到报告与复核记录',['ashare-process']]
 ]},
 hkex:{name:'港交所ESG披露',type:'政策监管 · 学习路径',lead:'先分清披露责任，再完成环境、社会和气候相关信息披露。',start:'首次编制从“责任与范围”开始；补充气候披露可直接进入“气候披露”。',source:'HKEX Appendix C2 ESG Reporting Code 及实施指引。',steps:[
  ['责任与范围','确认主体、期间和对应披露责任。','得到报告边界与义务判断',['hkex-1-1','hkex-1-3']],
  ['报告基础','完成强制披露并以四项汇报原则建立质量标准。','得到基础信息与质量检查表',['hkex-1-1','hkex-1-2']],
  ['环境与社会','逐项回应遵守或解释条文与关键绩效指标。','得到环境、社会披露和KPI证据',['hkex-5-1','hkex-5-2','hkex-5-3','hkex-6-1','hkex-6-2','hkex-6-3','hkex-6-4','hkex-6-5']],
  ['气候披露','沿管治、策略、风险管理、指标及目标四支柱展开。','得到气候披露工作底稿',['hkex-cd-3','hkex-cd-4','hkex-cd-9','hkex-cd-10','hkex-cd-12']],
  ['编制与复核','汇总责任、数据、证据和适用安排。','得到最终报告复核包',['hkex-2-1','hkex-2-2','hkex-2-3','hkex-cd-2']]
 ]},
 csa:{name:'CSA企业评估',type:'评级标准 · 学习路径',lead:'沿行业到评分的关系链理解 CSA：先行业，再标准、问题、证据和结果。',start:'了解评估从“评估定位”开始；准备问卷从“行业与问卷”开始；查要求从“标准与权重”开始。',source:'S&P Global Sustainable1 CSA Methodology Handbook、ESG Scores Methodology 与参与指引。',steps:[
  ['评估定位','区分CSA、ESG Score、年度周期与行业内比较。','得到正确的评估边界',[]],
  ['行业与问卷','行业决定适用问题与权重。','得到行业问卷与工作范围',[]],
  ['标准与权重','在治理、环境、社会维度中定位34项标准。','得到标准优先级与适用行业',[]],
  ['问题与证据','按子主题回答问题并组织公开或内部支持材料。','得到问题级证据清单',[]],
  ['评分与结果','理解数据怎样经评分、权重和MSA进入结果。','得到结果解释框架',[]]
 ]}
};
const n=x=>String(x+1).padStart(2,'0');
const itemsFor=(standard,step,index)=>{const all=(standard.groups||[]).flatMap(g=>g.items||[]);if(standard.id==='ashare'&&index===3)return all.filter(i=>!['ashare-framework','ashare-materiality','ashare-process','ashare-governance'].includes(i.id));if(standard.id==='csa'&&index===2)return all;if(standard.id==='csa'&&index===3)return all.filter(i=>i.id.startsWith('CSA-'));return all.filter(i=>step[3].includes(i.id));};
const architecture={
 ashare:[
  {layer:'国家准则底座',name:'财政部《企业可持续披露准则——基本准则（试行）》',role:'为各类企业可持续信息披露提供一般要求，是可持续披露准则体系的基础',kind:'base'},
  {layer:'监管统筹',name:'中国证监会',role:'统筹构建上市公司可持续披露规则体系，指导交易所发布规则',kind:'super'},
  {layer:'强制底线 · 核心文件',name:'沪深北三所《上市公司可持续发展报告指引》',role:'四要素披露框架 + 21 项议题；2024-05-01 起实施，规范披露的强制底线',kind:'core'},
  {layer:'参考规范',name:'三所《上市公司可持续发展报告编制指南》',role:'总体要求与披露框架、应对气候变化及环境议题应用指南，细化编制方法',kind:'guide'}
 ],
 hkex:[
  {layer:'上市监管框架',name:'香港交易所《上市规则》',role:'附录C2《环境、社会及管治报告守则》是ESG披露的规则基础',kind:'super'},
  {layer:'强制与不遵守就解释',name:'ESG报告守则 B / C 部分',role:'B 部分为强制披露，C 部分为不遵守就解释；覆盖环境、社会及管治披露',kind:'core'},
  {layer:'气候披露',name:'ESG报告守则 D 部分',role:'气候相关披露要求，与 ISSB IFRS S2 对齐，按四大支柱展开',kind:'core'},
  {layer:'实施指引',name:'气候信息披露实施指引 / ESG Academy',role:'提供实施方法、宽免安排与示例，辅助守则落地',kind:'guide'}
 ],
 csa:[
  {layer:'评估体系',name:'S&P Global CSA 企业可持续发展评估',role:'始于 1999 年，覆盖约 13,000 家公司的深度可持续绩效评估',kind:'super'},
  {layer:'评估框架',name:'CSA 方法论与评分方法',role:'62 个行业特定问卷、34 项标准，基于财务重要性与双重重要性',kind:'core'},
  {layer:'行业落地',name:'行业问卷与权重',role:'行业决定适用问题与相对权重，结果以行业内可比性为前提',kind:'guide'}
 ]
};
const pillarCards={
 ashare:[
  {name:'治理',desc:'披露主体如何治理和监督管理可持续相关影响、风险和机遇'},
  {name:'战略',desc:'披露主体应对影响、风险和机遇所采取的策略与规划'},
  {name:'影响、风险和机遇管理',desc:'识别、评估、监测与管理影响、风险和机遇的流程'},
  {name:'指标与目标',desc:'评估和管理相关影响、风险和机遇所用的指标与目标'}
 ],
 hkex:[
  {name:'管治',desc:'用于监督和管理气候相关风险与机遇的治理流程、控制与程序'},
  {name:'策略',desc:'管理气候相关风险与机遇的策略，以及纳入整体业务策略的方式'},
  {name:'风险管理',desc:'识别、评估、优先排序和监测气候相关风险的流程'},
  {name:'指标及目标',desc:'评估和管理气候相关风险与机遇的指标与目标'}
 ],
 csa:[
  {name:'治理与经济',desc:'公司治理、商业道德、风险管理与创新等基础性标准'},
  {name:'环境',desc:'气候变化、水资源、生物多样性与循环经济等环境标准'},
  {name:'社会',desc:'人力资本、社区影响、供应链与客户关系等社会标准'}
 ]
};
window.renderLearningPathV3=function({standard,esc,href}){
 const data=routes[standard.id];if(!data)return null;
 const groups=standard.groups||[],allItems=groups.flatMap(g=>g.items||[]);
 const arch=(architecture[standard.id]||[]).map((node,i)=>`<div class="lp-arch-node ${node.kind}"><span>${esc(node.layer)}</span><b>${esc(node.name)}</b><p>${esc(node.role)}</p>${node.kind==='core'?'<i>核心</i>':''}</div>`).join('');
 const pillars=(pillarCards[standard.id]||[]).map((p,i)=>`<article class="lp-pillar"><span>${n(i)}</span><b>${esc(p.name)}</b><p>${esc(p.desc)}</p></article>`).join('');
 const concepts=(groups[0]?.items||[]).map(item=>`<a class="lp-concept" href="${href('topic.html',{standard:standard.id,id:item.id})}"><span>${esc(item.eyebrow||'关键概念')}</span><b>${esc(item.title)}</b><p>${esc(String(item.summary||'').slice(0,60))}</p><small>查看解读 →</small></a>`).join('');
 const panel=(step,index)=>{
  const items=itemsFor(standard,step,index);
  return `<section class="lp-stage${index?' is-hidden':''}" data-stage="${index}"><div class="lp-stage-head"><span>${n(index)} · ${esc(step[0])}</span><div><b>${esc(step[1])}</b><p>完成后：${esc(step[2])}</p></div></div><div class="lp-stage-body">${items.length?`<div class="lp-stage-label">本步骤关联知识点</div><div class="lp-stage-grid">${items.map(item=>`<a href="${href('topic.html',{standard:standard.id,id:item.id})}"><small>${esc(item.eyebrow||'知识点')}</small><b>${esc(item.title)}</b><span>${esc(String(item.summary||'').slice(0,56))}</span><em>查看 →</em></a>`).join('')}</div>`:`<div class="lp-stage-label">本步骤为方法流程</div><div class="lp-stage-steps">${esc(step[1])}。${esc(step[2])}。</div>`}</div></section>`;
 };
 const issueZones=groups.map((group,gi)=>`<section class="lp-issue-zone" data-zone="${gi}"><header><div><span>${n(gi)} · 议题分类</span><h3>${esc(group.title)}</h3></div><p>${group.items.length} 项议题</p></header><div class="lp-issue-grid">${group.items.map(item=>`<a href="${href('topic.html',{standard:standard.id,id:item.id})}"><span>${esc(item.eyebrow||'议题')}</span><b>${esc(item.title)}</b><p>${esc(String(item.summary||'').slice(0,52))}</p><small>查看解读 →</small></a>`).join('')}</div></section>`).join('');
 return `<div class="lp-page" data-system="${standard.id}"><header class="mp-topbar"><div class="mp-topbar-inner"><a class="mp-brand" href="${href('index.html')}"><span>${esc(data.name.slice(0,1))}</span>${esc(data.name)}</a><nav><a href="#path">学习路径</a><a href="#issues">议题总览</a><a href="#sources">来源</a></nav></div></header><main class="lp-main"><a class="lp-back" href="${href('index.html')}">← 返回知识学堂</a>
 <section class="lp-hero"><div class="lp-hero-copy"><span class="lp-kicker">${esc(data.type)}</span><h1>${esc(standard.title)}</h1><p>${esc(data.lead)}</p><div class="lp-goals">${(standard.goals||[]).map(g=>`<i>${esc(g)}</i>`).join('')}</div></div><aside><b>从哪里开始</b><p>${esc(data.start)}</p><div class="lp-stats"><article><small>框架模块</small><strong>${groups.length}</strong></article><article><small>议题条目</small><strong>${allItems.length}</strong></article><article><small>官方文件</small><strong>${(standard.officialFiles||[]).length}</strong></article></div></aside></section>
 <section class="lp-block" id="arch"><header class="lp-block-head"><div><span>标准体系架构</span><h2>先看清文件层级与各自作用</h2></div><p>自上而下理解规则来源、强制程度与辅助材料，避免混淆文件效力。</p></header><div class="lp-arch">${arch}</div></section>
 <section class="lp-block" id="framework"><header class="lp-block-head"><div><span>核心框架</span><h2>${standard.id==='csa'?'标准体系按三个维度组织':'披露要求围绕核心框架展开'}</h2></div><p>${standard.id==='csa'?'CSA 的标准按治理、环境、社会三维度组织，行业决定适用与权重。':'框架是理解具体议题的“骨架”，议题披露按框架逐项展开。'}</p></header><div class="lp-pillars">${pillars}</div></section>
 ${concepts?`<section class="lp-block" id="concepts"><header class="lp-block-head"><div><span>重要概念与流程</span><h2>${esc(groups[0]?.title||'先掌握这些概念')}</h2></div><p>概念是阅读议题条文的前提，点击卡片进入详细解读。</p></header><div class="lp-concepts">${concepts}</div></section>`:''}
 <section class="lp-block" id="path"><header class="lp-block-head"><div><span>推荐学习路径</span><h2>按工作环节选择学习路线</h2></div><p>路径用于引导；你始终可以直接进入任意知识点。</p></header><div class="lp-steps">${data.steps.map((s,i)=>`<button class="${i?'':'is-active'}" type="button" data-path-step="${i}"><span>${n(i)}</span><b>${esc(s[0])}</b><small>${esc(s[1])}</small></button>`).join('')}</div><div class="lp-stages">${data.steps.map(panel).join('')}</div></section>
 <section class="lp-block" id="issues"><header class="lp-block-head"><div><span>议题总览</span><h2>${allItems.length} 项议题 · 按分类浏览</h2></div><p>每项议题均包含官方条文原文、知识解读与跨标准映射。</p></header>${issueZones}</section>
 <section id="sources" class="lp-sources"><span>来源与使用边界</span><p>${esc(standard.sourceNote||data.source)}</p>${(standard.officialFiles||[]).length?`<div class="lp-official-files"><b>官方发布文件</b><ul>${standard.officialFiles.map(f=>`<li><a href="${esc(f.url)}" target="_blank" rel="noreferrer">${esc(f.name)} ↗</a></li>`).join('')}</ul></div>`:''}<p>${esc(standard.notice||'正式工作请核对发布机构现行文件。')}</p><small class="lp-ai-note">本学习路径为 AI 基于上述官方文件整理的结构化解析，仅用于学习参考；条文与适用要求请以发布机构现行文件为准。</small></section></main></div>`;
};
window.bindLearningPathV3=function(root){root.querySelectorAll('[data-path-step]').forEach(button=>button.addEventListener('click',()=>{const i=button.dataset.pathStep;root.querySelectorAll('[data-path-step]').forEach(x=>x.classList.toggle('is-active',x===button));root.querySelectorAll('[data-stage]').forEach(x=>x.classList.toggle('is-hidden',x.dataset.stage!==i));}));};
})();
