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
const csaFrame=(index,esc)=>{const frames=[['CSA如何看企业','年度评估围绕企业可持续发展绩效展开；结果以行业内可比性为前提。','先区分CSA问卷、ESG Score与争议调整的作用。'],['行业先于问题','行业决定重要议题、适用问题与相对权重。','先确认公司所属行业，再回到当期行业问卷核对。'],['结果如何形成','问题级得分经问题权重、标准权重与维度汇总形成结果。','MSA会根据争议事件的责任、重要性与时效性影响相关标准。']][index===0?0:index===1?1:2];return `<div class="lp-framework"><span>方法框架</span><b>${esc(frames[0])}</b><p>${esc(frames[1])}</p><small>${esc(frames[2])}</small></div>`};
window.renderLearningPathV3=function({standard,esc,href}){const data=routes[standard.id];if(!data)return null;const panel=(step,index)=>{const items=itemsFor(standard,step,index),frame=standard.id==='csa'&&[0,1,4].includes(index)?csaFrame(index,esc):'';return `<section class="lp-stage${index?' is-hidden':''}" data-stage="${index}"><aside><span>${n(index)} · 当前节点</span><h3>${esc(step[0])}</h3><p>${esc(step[1])}</p><small>完成后</small><strong>${esc(step[2])}</strong></aside><div class="lp-stage-main"><div class="lp-stage-head"><div><span>关联知识</span><h3>从这里进入具体内容</h3></div><p>${items.length?`${items.length} 个知识点`:'方法框架'}</p></div>${frame}${items.length?`<div class="lp-topic-grid">${items.map(item=>`<a href="${href('topic.html',{standard:standard.id,id:item.id})}"><small>${esc(item.eyebrow||'知识点')}</small><b>${esc(item.title)}</b><span>${esc(String(item.summary||'').slice(0,70))} →</span></a>`).join('')}</div>`:''}<div class="lp-next">${index<data.steps.length-1?`下一步：${esc(data.steps[index+1][0])} →`:'完成后，可回到任意知识点深入查阅。'}</div></div></section>`};return `<div class="lp-page" data-system="${standard.id}"><header class="mp-topbar"><div class="mp-topbar-inner"><a class="mp-brand" href="${href('index.html')}"><span>${esc(data.name.slice(0,1))}</span>${esc(data.name)}</a><nav><a href="#path">学习路径</a><a href="#sources">来源</a></nav></div></header><main class="lp-main"><a class="lp-back" href="${href('index.html')}">← 返回知识学堂</a><section class="lp-intro"><div><span>${esc(data.type)}</span><h1>${esc(standard.title)}</h1><p>${esc(data.lead)}</p></div><aside><b>从哪里开始</b><p>${esc(data.start)}</p><small>官方依据</small><p>${esc(data.source)}</p></aside></section><section id="path" class="lp-path"><header><div><span>推荐学习路线</span><h2>先选择你正在解决的工作环节</h2></div><p>路径用于引导；你始终可以直接进入任意知识点。</p></header><div class="lp-steps">${data.steps.map((s,i)=>`<button class="${i?'':'is-active'}" type="button" data-path-step="${i}"><span>${n(i)}</span><b>${esc(s[0])}</b><small>${esc(s[1])}</small></button>`).join('')}</div><div class="lp-stages">${data.steps.map(panel).join('')}</div></section><section id="sources" class="lp-sources"><span>来源与使用边界</span><p>${esc(standard.sourceNote||data.source)}</p><p>${esc(standard.notice||'正式工作请核对发布机构现行文件。')}</p></section></main></div>`};
window.bindLearningPathV3=function(root){root.querySelectorAll('[data-path-step]').forEach(button=>button.addEventListener('click',()=>{const i=button.dataset.pathStep;root.querySelectorAll('[data-path-step]').forEach(x=>x.classList.toggle('is-active',x===button));root.querySelectorAll('[data-stage]').forEach(x=>x.classList.toggle('is-hidden',x.dataset.stage!==i));}));};
})();
