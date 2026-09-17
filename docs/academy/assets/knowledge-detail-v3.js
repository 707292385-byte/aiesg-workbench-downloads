(function(){
'use strict';
const clean=v=>String(v||'').replace(/^[•◦]\s*/,'').replace(/\s+/g,' ').trim();
const typeLabel={rule:'披露规则',topic:'披露议题',process:'工作流程',criterion:'评估标准'};
const relationType={official:'官方引用',structure:'结构对应',concept:'概念关联',evidence:'证据复用',dependency:'前置依赖'};
const make=(label,desc)=>({label,desc});
function profile(standard,item,detail){
 const id=item.id, title=detail.title||item.title;
 if(standard.id==='csa')return {kind:'criterion',nodes:['行业','评估标准','问题组','支持材料','行业内评分'],guide:['确认所属行业与当期问卷。','定位本标准的子主题与题目。','把公开披露、制度和内部资料对应到问题。','回到当期适用问卷核对口径与权重。'],relations:[make('concept','与A股、港交所的治理与议题披露形成概念关联；不代表任一披露即可替代CSA问卷回答。'),make('evidence','治理架构、目标和公开报告可作为证据复用线索，仍须按CSA问题的数据要求核验。')]};
 if(standard.id==='ashare'&&id==='ashare-materiality')return {kind:'rule',nodes:['议题清单','财务重要性','影响重要性','双重重要性判断','披露后果'],guide:['列出经营活动、价值链和利益相关方相关议题。','分别判断对企业价值与对环境社会的影响。','保留判断依据、参与记录和审议结论。','将重要议题落实到报告结构与数据责任。'],relations:[make('structure','与港交所“重要性”报告原则形成结构对应，适用规则和披露文本仍需分别核对。'),make('concept','与CSA的双重重要性方法形成概念关联，CSA以行业问卷和评分口径为准。')]};
 if(standard.id==='ashare'&&id==='ashare-process')return {kind:'process',nodes:['准备','议题与边界','数据与撰写','内部复核','发布留档'],guide:['确认报告期、适用规则和职责分工。','形成重要议题和披露边界的判断记录。','按主题准备数据、说明和支持材料。','检查一致性、审批与版本。'],relations:[make('dependency','以适用与版本、重要性判断为前置依赖。'),make('evidence','报告底稿和数据台账可为其他披露或评估工作提供证据线索。')]};
 if(standard.id==='ashare')return {kind:id==='ashare-framework'?'rule':'topic',nodes:['议题','治理','战略','管理','指标与目标','证据与披露'],guide:['确认议题是否属于重要议题与适用范围。','说明治理责任与管理安排。','整理行动、指标、目标及证据。','用一致口径形成可复核披露。'],relations:[make('concept','与港交所ESG议题披露存在概念关联，具体条文和指标口径需分别执行。'),make('evidence','与CSA相关标准可能复用治理、制度或绩效资料，但CSA问卷另有评分要求。')]};
 if(standard.id==='hkex'&&id==='hkex-1-1')return {kind:'rule',nodes:['Part B','强制披露','Part C','遵守或解释','Part D','气候披露'],guide:['先确认报告主体、期间与责任。','区分强制披露、遵守或解释及气候披露。','逐项建立条文、负责人、证据和报告位置的对应。','在报告发布前重新核对现行Appendix C2。'],relations:[make('structure','与A股报告的披露架构形成结构对应，不代表要求或适用范围相同。'),make('dependency','后续环境、社会、气候主题均以前述义务判断为前置依赖。')]};
 if(standard.id==='hkex'&&id.startsWith('hkex-cd-')){const pillar=id==='hkex-cd-3'?'管治':/cd-[4-8]/.test(id)?'策略':id==='hkex-cd-9'?'风险管理':'指标及目标';return {kind:'topic',nodes:['气候风险与机遇',pillar,'管理安排','指标或目标','报告披露'],guide:['确认本主题在气候四支柱中的位置。','明确董事会或管理层的角色和机制。','把风险、策略、目标或指标与已有证据连接。','按Appendix C2当前版本核对披露表述。'],relations:[make('structure','与TCFD/ISSB气候四支柱形成结构对应；本页以HKEX Appendix C2的适用要求为准。'),make('concept','与A股气候相关议题形成概念关联，适用主体、过渡和披露细节不同。')]};}
 if(standard.id==='hkex')return {kind:'topic',nodes:['披露主题','适用条文','管理行动','KPI或说明','支持证据'],guide:['定位对应披露条文和遵守或解释要求。','确认管理责任与执行安排。','核对KPI、叙述说明及数据边界。','保留来源、计算和审核记录。'],relations:[make('structure','与A股同类议题形成结构对应，不能直接互换披露文本。'),make('evidence','同一治理制度或数据底稿可能复用，但需按本规则的KPI和边界复核。')]};
 return {kind:'topic',nodes:['主题','要求','证据','应用'],guide:[],relations:[]};
}
const isEvidence=t=>/指标|数据|KPI|目标|证据|资料|问题|披露|量化|绩效|排放|比例|统计/.test(t);
const isSource=t=>/来源|参考|附录|版本|提示/.test(t);
function relationKind(value){if(/ISSB|IFRS|S1|S2|GRI|TCFD|SASB|CSRD|ESRS|SFDR|国际|基准/.test(value))return'国际基准映射';if(/港交所|HKEX|守则|A股|沪深|交易所|指引|CSA|标普/.test(value))return'披露体系对应';if(/双重重要性|重要性矩阵|重要性|议题|评估|矩阵/.test(value))return'方法概念关联';return'概念关联';}
function renderBlocks(blocks,renderBlock,prefix){return (blocks||[]).map((b,i)=>renderBlock(b,`${prefix}-${i}`)).join('');}
window.renderKnowledgeDetailV3=function({standard,item,group,detail,sections,relations,source,esc,renderBlock,href}){
 const p=profile(standard,item,detail),type=typeLabel[p.kind]||'知识主题';
 const official=[],evidence=[],notes=[];
 (sections||[]).forEach((section,index)=>{
  const blocks=(section.blocks||[]).filter(b=>clean(b.content_cn||b.content));
  const isOfficial=blocks.some(b=>b.provenance==='official'||b.provenance==='official_guidance');
  if(isOfficial){official.push({section,index,blocks});}
  else if(isEvidence(section.title)&&!isSource(section.title)){evidence.push({section,index,blocks});}
  else if(!isSource(section.title)){notes.push({section,index,blocks});}
 });
 const taggedRelations=[...p.relations,...(relations||[]).map(v=>make(relationKind(v),v))];
 const mapKind=standard.id==='csa'?`<div class="kd-map-strip"><span>评估定位</span><b>${esc(group?.title||'标准')}</b><i>→</i><span>评估标准</span><i>→</i><span>问题组与证据</span><i>→</i><span>行业内评分</span></div>`:`<div class="kd-map-strip"><span>${esc(standard.title)}</span><i>→</i><span>${esc(group?.title||'议题分类')}</span><i>→</i><b>${esc(item.title)}</b></div>`;
 const originalHtml=official.length?`<div class="kd-original">${official.map(({section,blocks,index})=>`<article><header><span>官方条文摘录</span><h3>${esc(section.title)}</h3></header><div class="kd-original-body">${renderBlocks(blocks,renderBlock,`official-${index}`)}</div></article>`).join('')}</div>`:`<div class="kd-empty"><b>官方原文入口</b><p>本页当前保留官方来源入口与平台整理摘要；原文请通过文末“官方发布文件”链接进入发布机构现行文件。</p></div>`;
 const notesHtml=notes.length?`<div class="kd-notes">${notes.map(({section,blocks,index})=>`<article><h4>${esc(section.title)}</h4>${renderBlocks(blocks,renderBlock,`note-${index}`)}</article>`).join('')}</div>`:'';
 const evidenceHtml=evidence.length?`<div class="kd-evidence">${evidence.map(({section,blocks,index})=>`<article><h4>${esc(section.title)}</h4>${renderBlocks(blocks,renderBlock,`evidence-${index}`)}</article>`).join('')}</div>`:'';
 const mapHtml=taggedRelations.length?`<div class="kd-mapping">${taggedRelations.map((r,i)=>`<article><span>${relationType[r.label]||r.label||'概念关联'}</span><b>${esc(r.desc)}</b></article>`).join('')}</div>`:`<div class="kd-empty">暂未整理其它标准的映射关系；可结合文末官方来源进入发布机构文件对照。</div>`;
 const questionHtml=standard.id==='csa'&&detail.questionGroups?.length?`<section class="kd-sec" id="questions"><header><span>问题索引</span><h2>评估问题与资料要求</h2><p>问题内容以当期适用问卷为准；此处展示已整理的评估焦点。</p></header><div class="kd-questions">${detail.questionGroups.map((g,gi)=>`<article><h4>${String(gi+1).padStart(2,'0')} · ${esc(g.title)}</h4><ul>${(g.questions||[]).map(q=>`<li><b>${esc(q.title||'问题')}</b><span>${esc(String(q.focus||q.guidance||'').slice(0,96))}</span></li>`).join('')}</ul></article>`).join('')}</div></section>`:'';
 return `<div class="kd-page" data-system="${esc(standard.id)}"><header class="kd-top"><a href="${href('standard.html',{id:standard.id})}">← ${esc(standard.title)}</a><span>${esc(type)}</span></header><main class="kd-main">
 <section class="kd-title"><div><p>${esc(group?.title||detail.eyebrow||'知识主题')} · ${esc(type)}</p><h1>${esc(detail.title||item.title)}</h1><div class="kd-summary">${esc(detail.summary||item.summary||'')}</div><div class="kd-tags">${(detail.tags||item.tags||[]).map(t=>`<i>${esc(t)}</i>`).join('')}</div></div><aside><b>阅读这页</b><p>按“标准位置 → 原文 → 解读 → 映射 → 行动”的顺序阅读，页面解释帮助工作，不替代正式文件。</p><a href="#sources">查看来源与边界 ↓</a></aside></section>
 <section class="kd-locate"><header><span>标准位置</span><h2>这一页在标准体系中的位置</h2></header>${mapKind}<div class="kd-relation-map"><span>${esc(standard.title)}</span><i>→</i>${p.nodes.map((node,ni)=>`<span>${esc(node)}</span>${ni<p.nodes.length-1?'<i>→</i>':''}`).join('')}</div><p class="kd-map-note">${esc(p.kind==='criterion'?'CSA 用“行业—标准—问题—证据—评分”理解评估关系。':p.kind==='process'?'流程节点按前后依赖阅读；每一步均应留下可复核的工作记录。':'由议题进入要求与证据，再形成可核对的披露工作。')}</p></section>
 <section class="kd-sec" id="original"><header><span>官方原文</span><h2>标准的具体要求</h2><p>以下为按官方文件整理的条文摘录；完整条款请进入来源链接核对原文。</p></header>${originalHtml}</section>
 ${notesHtml?`<section class="kd-sec" id="notes"><header><span>知识解读</span><h2>怎么理解这条要求</h2><p>以下为 AI 基于官方文件整理的解读，非发布机构正式条文。</p></header>${notesHtml}<small class="kd-ai-tag">AI 整理 · 供学习参考</small></section>`:''}
 ${evidenceHtml?`<section class="kd-sec" id="evidence"><header><span>指标与证据</span><h2>需要准备的数据与材料</h2></header>${evidenceHtml}</section>`:''}
 <section class="kd-sec" id="mapping"><header><span>跨标准映射</span><h2>与其它标准的关系</h2><p>了解本议题与其它披露体系、评估框架的对应关系，避免重复造数据。</p></header>${mapHtml}</section>
 ${questionHtml}
 <section class="kd-sec" id="guide"><header><span>工作动作</span><h2>这一步具体做什么</h2></header><ol class="kd-guide">${p.guide.map((x,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span><p>${esc(x)}</p></li>`).join('')}</ol></section>
 <section id="sources" class="kd-sources"><span>来源与使用边界</span><h2>回到发布机构文件核对版本</h2><p>${esc(source||standard.sourceNote||'')}</p><p>${esc(detail.status||item.status||standard.notice||'')}</p>${detail.officialUrl?`<a href="${esc(detail.officialUrl)}" target="_blank" rel="noreferrer">查看发布机构资料 ↗</a>`:''}<small class="kd-ai-note">本页为 AI 基于官方文件整理的解析内容（“知识解读”部分为平台整理，非发布机构正式条文）；摘要不能替代现行原文，正式工作请核对发布机构文件。</small></section></main></div>`;
};
})();
