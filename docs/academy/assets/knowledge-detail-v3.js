(function(){'use strict';
const para=(value,esc)=>String(value||'').split(/\n{2,}/).map(part=>`<p>${esc(part.trim()).replace(/\n/g,'<br>')}</p>`).join('');
const stripFigureNotice=value=>String(value||'').replace(/\n*完整图表、公式见官方原件：[\s\S]*$/,'').trim();
/* —— 悬浮显示原文 ——
   块级/条目级可挂 quote（官方原文）。这里只登记内容并输出一个锚点，
   浮层由全局单例渲染，避免被卡片的 overflow:hidden 裁掉。
   quote 取值：字符串，或 {text, source, related:{label,url,text}} */
const quoteStore=new Map();
function quoteMark(quote,esc,label){
 if(!quote)return '';
 const data=typeof quote==='string'?{text:quote}:quote;
 if(!data||!data.text)return '';
 const id='q'+(quoteStore.size+1);
 quoteStore.set(id,data);
 const hasRelated=Boolean(data.related&&data.related.text);
 return `<button class="kd-q-btn" type="button" data-qid="${esc(id)}" aria-label="${esc(hasRelated?'查看官方原文与关联知识原文':'查看官方原文')}">${esc(label||'原文')}</button>`;
}
window.kdQuoteMark=quoteMark;
/* 把“原文”收进对应句子的句末。优先放在最后一个段落或列表项中；
   只有内容本身没有可挂载文本时才直接跟在内容后面。 */
function attachQuote(html,quote,esc,label){
 const mark=quoteMark(quote,esc,label);
 if(!mark)return html;
 const value=String(html||'');
 const closers=['</p>','</li>','</figcaption>'];
 let at=-1,closer='';
 closers.forEach(candidate=>{const index=value.lastIndexOf(candidate);if(index>at){at=index;closer=candidate;}});
 return at>=0?`${value.slice(0,at)}${mark}${value.slice(at)}`:`${value}${mark}`;
}
window.kdAttachQuote=attachQuote;
const mofLayers={
 original:{eyebrow:'准则原文',title:'准则条款原文',desc:'按章与条呈现准则正文，条款号保留原文表述。'},
 guide:{eyebrow:'应用指南',title:'官方应用指南原文',desc:'按指南原有标题与条款结构呈现，逐节给出概括。'},
 practical:{eyebrow:'理解与实务',title:'权威标准辅助解读与实务提示',desc:'优先引用权威来源；没有直接来源时才标为 AI 辅助建议。'}
};
const sourceLayers={
 original:{eyebrow:'官方原文',title:'发布机构的正式要求',desc:'保留原有编号、范围与约束；存在对应官方英文时，在中文句末显示 EN。'},
 guide:{eyebrow:'官方指南',title:'',desc:''},
 practical:{eyebrow:'核心内容',title:'知识拆解与实务提示',desc:'正文以官方资料为依据；权威解读、整理性说明和 AI 辅助梳理分别标识，句末“原文”可悬浮核对。'}
};
const hubLayers={
 gri:{original:{eyebrow:'标准原文',title:'GRI 披露要求原文',desc:'按标准原有章节与披露项呈现官方中文版正文；披露项编号保留原文表述。'},
     guide:{eyebrow:'配套文件',title:'官方指南与配套文件',desc:'按指南原有标题与章节呈现配套文件内容。'},
     practical:{eyebrow:'理解与实务',title:'权威标准辅助解读与实务提示',desc:'优先引用权威来源；没有直接来源时才标为 AI 辅助建议。'}},
 sasb:{original:{eyebrow:'行业标准原文',title:'SASB 行业标准原文',desc:'SASB 标准暂无官方中文版，本页呈现英文原件的结构化整理；行业与板块中文名为通译参考。'},
     guide:{eyebrow:'配套文件',title:'官方指南与配套文件',desc:'按指南原有标题与章节呈现配套文件内容。'},
     practical:{eyebrow:'理解与实务',title:'权威标准辅助解读与实务提示',desc:'优先引用权威来源；没有直接来源时才标为 AI 辅助建议。'}},
 ifrs:{original:{eyebrow:'准则要求原文',title:'IFRS 准则要求原文',desc:'按准则原有章节呈现官方中文版正文；段落编号保留原文表述。'},
     guide:{eyebrow:'配套文件',title:'官方指南与配套文件',desc:'按指南原有标题与章节呈现配套文件内容。'},
     practical:{eyebrow:'理解与实务',title:'权威标准辅助解读与实务提示',desc:'优先引用权威来源；没有直接来源时才标为 AI 辅助建议。'}},
 ecovadis:{original:{eyebrow:'方法学原文',title:'EcoVadis 方法学原文',desc:'官方英文方法学披露文件的结构化整理，按文件原有章节呈现。'},
     guide:{eyebrow:'配套文件',title:'官方指南与配套文件',desc:'按指南原有标题与章节呈现配套文件内容。'},
     practical:{eyebrow:'理解与实务',title:'权威标准辅助解读与实务提示',desc:'优先引用权威来源；没有直接来源时才标为 AI 辅助建议。'}},
 guozheng:{original:{eyebrow:'评价方法原文',title:'国证ESG评价方法原文',desc:'按官网发布文件原有章节呈现正文。'},
     guide:{eyebrow:'配套文件',title:'官方指南与配套文件',desc:'按指南原有标题与章节呈现配套文件内容。'},
     practical:{eyebrow:'理解与实务',title:'权威标准辅助解读与实务提示',desc:'优先引用权威来源；没有直接来源时才标为 AI 辅助建议。'}},
 sbti:{original:{eyebrow:'标准要求原文',title:'SBTi 标准与准则要求',desc:'SBTi 官方文件中必须满足的目标设定要求，措辞保持原文。'},
     guide:{eyebrow:'官方指南',title:'SBTi 官方指南与流程说明',desc:'SBTi 发布的配套指南、工具与验证流程说明的结构化整理。'},
     practical:{eyebrow:'核心内容',title:'SBTi 科学碳目标制定 · 核心内容',desc:'把官方标准与准则要求提炼成可直接使用的判断与操作要点；要点的「原文」可悬浮查看官方英文原文。'}},
 ghg:{original:{eyebrow:'标准原文',title:'GHG Protocol 标准原文',desc:'《温室气体核算体系：企业核算与报告标准（修订版）》官方简体中文版正文，按原书章节呈现。'},
     guide:{eyebrow:'配套文件',title:'官方指南与配套文件',desc:'按指南原有标题与章节呈现配套文件内容。'},
     practical:{eyebrow:'核心内容',title:'温室气体核算 · 核心内容',desc:'把核算原则、边界设定与三个范围提炼成可直接使用的判断与操作要点；要点的「原文」可悬浮查看官方原文。'}},
 tcfd:{original:{eyebrow:'建议原文',title:'TCFD 建议与实施指南原文',desc:'TCFD 最终报告官方中译本与实施指南正文，按四支柱与建议披露呈现。'},
     guide:{eyebrow:'配套文件',title:'官方指南与配套文件',desc:'按指南原有标题与章节呈现配套文件内容。'},
     practical:{eyebrow:'核心内容',title:'气候相关财务披露 · 核心内容',desc:'把治理、战略、风险管理、指标与目标四支柱提炼成可直接使用的要点；要点的「原文」可悬浮查看官方原文。'}},
 cdp:{original:{eyebrow:'评分与问卷原文',title:'CDP 问卷与评分方法原文',desc:'CDP 2026 官方问卷与评分文件的结构化整理，按原有章节呈现。'},
     guide:{eyebrow:'官方指南',title:'CDP 官方填报与评分指南',desc:'CDP 发布的填报指南、评分介绍与类别权重文件。'},
     practical:{eyebrow:'核心内容',title:'CDP 披露与评分 · 核心内容',desc:'把问卷结构、评分维度与等级规则提炼成可直接使用的要点；要点的「原文」可悬浮查看官方原文。'}},
 assurance:{original:{eyebrow:'准则原文',title:'鉴证准则与标准原文',desc:'AA1000AS v3 中文版、ISSA 5000 英文原文与财政部第 6101 号准则正文，按原有章节呈现。'},
     guide:{eyebrow:'配套文件',title:'官方指南与配套文件',desc:'按指南原有标题与章节呈现配套文件内容。'},
     practical:{eyebrow:'核心内容',title:'ESG 鉴证与审验 · 核心内容',desc:'把鉴证类型、保证程度与结论形式提炼成可直接使用的判断与操作要点；要点的「原文」可悬浮查看官方原文。'}},
 tnfd:{original:{eyebrow:'建议原文',title:'TNFD 建议原文',desc:'TNFD 建议官方英文原件的结构化整理，按 LEAP 方法与四大支柱呈现。'},
     guide:{eyebrow:'配套文件',title:'官方指南与配套文件',desc:'按指南原有标题与章节呈现配套文件内容。'},
     practical:{eyebrow:'核心内容',title:'自然相关财务披露 · 核心内容',desc:'把 LEAP 方法与四支柱要求提炼成可直接使用的要点；要点的「原文」可悬浮查看官方英文原文。'}},
 csddd:{original:sourceLayers.original,guide:sourceLayers.guide,practical:{eyebrow:'',title:'',desc:''}},
 eubr:{original:sourceLayers.original,guide:sourceLayers.guide,practical:{eyebrow:'',title:'',desc:''}},
 eudr:{original:sourceLayers.original,guide:sourceLayers.guide,practical:{eyebrow:'',title:'',desc:''}}
};
function refs(block,esc){const items=block.references||[];if(!items.length)return'';return `<div class="kd-refs"><span>依据</span>${items.map(item=>`<a href="${esc(item.url||'#')}" target="_blank" rel="noreferrer">${esc(item.title||item.id||'参考来源')}${item.locator?` · ${esc(item.locator)}`:''} ↗</a>`).join('')}</div>`;}
function englishPair(chinese,english,esc){return `<div class="bilingual"><div class="cn-content">${para(chinese,esc)}</div>${english?`<button class="en-trigger" type="button" aria-expanded="false">EN</button><div class="en-popover" lang="en">${para(english,esc)}</div>`:''}</div>`;}
function officialBlock(block,key,esc,renderBlock,sectionTitle){const variants=block.exchangeVariants||[];if(!variants.length)return renderBlock(block,key);const order={SSE:0,SZSE:1,BSE:2},short={SSE:'上交所',SZSE:'深交所',BSE:'北交所'};variants.sort((a,b)=>(order[a.exchange]??9)-(order[b.exchange]??9));const groups=[];variants.forEach(item=>{const g=groups.find(x=>x.exchange===item.exchange);if(g)g.items.push(item);else groups.push({exchange:item.exchange,items:[item]});});const preferred=groups.findIndex(g=>g.exchange==='SSE'),active=preferred<0?0:preferred;const titleIsArticle=/^第[一二三四五六七八九十百]+条$/.test(String(sectionTitle||''));const tabs=`<div class="kd-exchange-tabs" role="tablist" aria-label="查看交易所依据">${groups.map((g,index)=>`<button type="button" role="tab" data-kd-exchange="${esc(g.exchange)}" aria-selected="${index===active}">${esc(short[g.exchange]||g.items[0].exchangeName)}</button>`).join('')}</div>`;const itemHtml=(item,first)=>`<div class="kd-rule-item"><div class="kd-rule-meta">${item.article&&!titleIsArticle?`<b>第${esc(item.article)}条</b>`:''}${item.comparisonStatus==='identical'?'<i>三所正文一致</i>':''}${first?tabs:''}</div>${englishPair(item.content||block.content_cn,item.officialEnglish?.content||'',esc)}<div class="kd-source-line">${item.sourceUrl?`<a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">中文原件 ↗</a>`:''}${item.officialEnglish?.sourceUrl?`<a href="${esc(item.officialEnglish.sourceUrl)}" target="_blank" rel="noreferrer">英文原件 ↗</a>`:''}${item.englishBindingNote?`<span title="${esc(item.englishBindingNote)}">英文版本说明 ⓘ</span>`:''}</div></div>`;return `<div class="kd-rule-card" data-kd-rule>${groups.map((g,index)=>`<section class="kd-exchange-panel" data-kd-panel="${esc(g.exchange)}"${index===active?'':' hidden'}>${g.items.map((item,i)=>itemHtml(item,i===0)).join('')}</section>`).join('')}</div>`;}
function quoteTail(item,esc,bodyKey,includeAfter=false){
 const body=item?.[bodyKey]||'',values=item?.items||[],after=includeAfter?(item?.after||''):'';
 const last=after?'after':values.length?'items':body?'body':'';
 return `${body?`<p>${esc(body)}${last==='body'?quoteMark(item.quote,esc):''}</p>`:''}${values.length?`<ul>${values.map((value,index)=>`<li>${esc(value)}${last==='items'&&index===values.length-1?quoteMark(item.quote,esc):''}</li>`).join('')}</ul>`:''}${after?`<p class="kd-card-after">${esc(after)}${quoteMark(item.quote,esc)}</p>`:''}`;
}
function processFlow(block,esc){const steps=block.steps||[],br=value=>esc(value).replace(/\n/g,'<br>'),stepBody=step=>step.desc?`<p>${br(step.desc)}${quoteMark(step.quote,esc)}</p>`:quoteMark(step.quote,esc);if(block.layout==='v')return `<div class="kd-flow kd-flow-v">${steps.map((step,index)=>`<article><span>${esc(step.icon||index+1)}</span><b>${esc(step.title)}${!step.desc?quoteMark(step.quote,esc):''}</b>${step.desc?stepBody(step):''}</article>`).join('')}</div>`;const cols=steps.length===3?' cols-3':'';return `<div class="kd-flow${cols}">${steps.map((step,index)=>`<article><span>${esc(step.icon||index+1)}</span><div><b>${esc(step.title)}${!step.desc?quoteMark(step.quote,esc):''}</b>${step.desc?stepBody(step):''}</div></article>`).join('')}</div>`;}
function pillarGrid(block,esc){const pillars=block.pillars||[],no=block.numbered!==false,cols=block.cols?' cols-'+block.cols:pillars.length===3?' cols-3':'';return `<div class="kd-pillars${cols}">${pillars.map((item,index)=>`<article>${no?`<span>${String(index+1).padStart(2,'0')}</span>`:''}${item.title?`<b>${esc(item.title)}${!item.desc&&!item.items?.length?quoteMark(item.quote,esc):''}</b>`:''}${item.desc||item.items?.length?quoteTail(item,esc,'desc'):''}</article>`).join('')}</div>`;}
function cardGrid(block,esc){const cards=block.cards||[];const no=block.numbered!==false&&cards.length>1,cols=block.cols?' cols-'+block.cols:cards.length===3?' cols-3':'';return `${block.title?`<p class="kd-grid-title">${esc(block.title)}${quoteMark(block.quote,esc)}</p>`:''}<div class="kd-card-grid${cols}">${cards.map((item,index)=>`<article>${no?`<span>${String(index+1).padStart(2,'0')}</span>`:''}${item.title?`<b>${esc(item.title)}${!item.content&&!item.items?.length&&!item.after?quoteMark(item.quote,esc):''}</b>`:''}${item.content||item.items?.length||item.after?quoteTail(item,esc,'content',true):''}</article>`).join('')}</div>`;}
function externalGrid(block,esc){return `<div class="kd-external-grid">${(block.items||[]).map(item=>`<article><span>${esc(item.type||'参考')}</span><b>${esc(item.name)}</b></article>`).join('')}</div>`;}
function structuredGuidance(value,esc){const text=String(value||''),matches=[...text.matchAll(/(?:^|\n)([一二三四五六七八九十]+、[^\n]+)\n/g)];if(matches.length<2)return para(text,esc);const intro=text.slice(0,matches[0].index).trim(),cards=matches.map((match,index)=>{const start=match.index+match[0].length,end=matches[index+1]?.index??text.length;return `<article><b>${esc(match[1])}</b>${para(text.slice(start,end).trim(),esc)}</article>`;});return `${intro?`<div class="kd-guidance-intro">${para(intro,esc)}</div>`:''}<div class="kd-guidance-grid">${cards.join('')}</div>`;}
const guideAssetKey=value=>String(value||'').replace(/[\s：:。；;，,]/g,'').toLowerCase();
/* 表格单元格兜底：合并 PDF 抽取的硬换行——中文句中断裂直接拼接，编号行保留分行，其余留空格 */
const cellCJK=/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;
const cellLead=/^\s*(?:[（(]?\d+[.、)）]|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]|[一二三四五六七八九十]+[、.])/;
function cellText(value){
 const parts=String(value||'').split(/[\r\n]+/).map(item=>item.trim()).filter(Boolean);
 if(parts.length<2)return parts[0]||'';
 let out=parts[0];
 for(const part of parts.slice(1)){
  if(cellLead.test(part))out+='\n'+part;
  else if(cellCJK.test(out.slice(-1))&&cellCJK.test(part[0]))out+=part;
  else out+=' '+part;
 }
 return out;
}
function guideAssetMarkup(asset,caption,esc){
 if(!asset)return `<div class="kd-guide-asset-missing"><b>${esc(caption)}</b><span>原件对象尚未恢复</span></div>`;
 const label=asset.label||caption||asset.cue||'官方原件内容';
 const longCue=value=>String(value||'').length>50;
 if(asset.kind==='image'){const cap=asset.label||caption||asset.cue||'';return `<figure class="kd-guide-figure">${longCue(cap)?'':`<figcaption>${esc(cap)}</figcaption>`}<div>${(asset.images||[]).map(image=>`<img src="${esc(image.src)}" alt="${esc(longCue(cap)?'官方编制指南图示':cap)}" loading="lazy">`).join('')}</div><small>官方编制指南图示</small></figure>`;}
 if(asset.kind==='formula'){const cap=asset.label||caption||asset.cue||'';return `<figure class="kd-guide-formula">${longCue(cap)?'':`<figcaption>${esc(cap)}</figcaption>`}<div class="kd-formula-value">${asset.mathml||para(asset.plainText||'',esc)}</div><small>官方编制指南公式</small></figure>`;}
 const rows=asset.rows||[];
 /* 官方有些表本身就是单格多行的清单（如报告框架、手册大纲），按清单呈现更易读 */
 if(rows.length===1&&rows[0].length===1){
  const lines=String(rows[0][0].text||'').split('\n').map(item=>item.trim()).filter(Boolean);
  if(lines.length>=3)return `<figure class="kd-guide-list"><figcaption>${esc(label)}</figcaption><ul>${lines.map(line=>`<li${/^[（(]/.test(line)?' class="is-sub"':''}>${esc(line)}</li>`).join('')}</ul><small>官方编制指南表格</small></figure>`;
 }
 return `<figure class="kd-guide-table"><figcaption>${esc(label)}</figcaption><div class="kd-table-scroll"><table>${rows.map((row,rowIndex)=>`<tr>${row.map(cell=>{const tag=rowIndex===0?'th':'td',images=(cell.images||[]).map(image=>`<img src="${esc(image.src)}" alt="${esc(image.alt||label)}" loading="lazy">`).join('');return `<${tag}${cell.colspan>1?` colspan="${cell.colspan}"`:''}${cell.rowspan>1?` rowspan="${cell.rowspan}"`:''}>${cell.text?esc(cellText(cell.text)).replace(/\n/g,'<br>'):''}${images}</${tag}>`;}).join('')}</tr>`).join('')}</table></div><small>官方编制指南表格</small></figure>`;
}
/* 官方指南：按原文层级（章 / 一、 / 步骤 / 1、 / （1））还原结构，剔除各级序号，逐节给一句概括 */
const guideTitleClean=value=>String(value||'')
 .replace(/^第[一二三四五六七八九十百]+[章节]\s*/,'')
 .replace(/^[一二三四五六七八九十]+、\s*/,'')
 .replace(/^步骤[一二三四五六七八九十]+\s*[:：]?\s*/,'')
 .replace(/^\d{1,2}\s*[.、]\s*/,'')
 .replace(/^（\s*(?:\d{1,2}|[一二三四五六七八九十]+)\s*）\s*/,'')
 .replace(/^\(\s*(?:\d{1,2}|[一二三四五六七八九十]+)\s*\)\s*/,'')
 .trim();
let mofLevel=false;
const guideLevel=value=>{
 const text=String(value||'');
 if(mofLevel){
  if(/^第[一二三四五六七八九十百]+[章节]/.test(text))return 1;
  if(/^[一二三四五六七八九十]+、/.test(text))return 1;
  if(/^[（(][一二三四五六七八九十]+[）)]/.test(text))return 2;
  if(/^步骤[一二三四五六七八九十]+\s*[:：]?/.test(text))return 2;
  if(/^\d{1,2}\s*[.、]/.test(text))return 3;
  if(/^[（(]\d{1,2}[）)]/.test(text))return 4;
  return 0;
 }

 if(/^第[一二三四五六七八九十百]+[章节]/.test(text))return 1;
 if(/^[一二三四五六七八九十]+、/.test(text))return 2;
 if(/^步骤[一二三四五六七八九十]+\s*[:：]?/.test(text))return 3;
 if(/^\d{1,2}\s*、/.test(text))return 4;
 if(/^[（(]\s*(?:\d{1,2}|[一二三四五六七八九十]+)\s*[）)]/.test(text))return 5;
 return 0;
};
function guideVisual(value,esc,availableAssets=[],digest={}){
 const chunks=String(value||'').split(/\n{2,}/).map(item=>item.trim()).filter(Boolean);
 const asset=/^(?:表|图|示例)\s*\d+(?:[.：:]|\s)/;
 const assetMap=new Map(availableAssets.map(item=>[item.cueKey||guideAssetKey(item.cue),item]));
 const nodes=[];let lead=[];
 const circled=/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]/;
 const bucket=()=>nodes.length?nodes[nodes.length-1].items:lead;
 chunks.forEach(chunk=>{
  const matched=assetMap.get(guideAssetKey(chunk)),isAsset=!!matched||asset.test(chunk),level=isAsset?0:guideLevel(chunk);
  if(!isAsset&&level){/* 编号条目一律成节点，统一拆分规则：术语冒号 / 首句 / 纯正文，保证序号不再残留在正文 */const cleaned=guideTitleClean(chunk),colon=cleaned.indexOf('：'),stop=cleaned.indexOf('。');let title='',rest='';if(colon>0&&colon<=20){title=cleaned.slice(0,colon);rest=cleaned.slice(colon+1).trim();}else if(stop>0&&stop<=44){title=cleaned.slice(0,stop+1);rest=cleaned.slice(stop+1).trim();}else if(cleaned.length>44){rest=cleaned;}else{title=cleaned;}nodes.push({level,title,items:rest?[{type:'text',value:rest}]:[]});return;}
  const items=bucket();
  if(isAsset){
   /* 个别图/公式在官方原件中无题注，抽取时把前面的正文段落当成了 cue：
      此时正文照常呈现，图示跟在段落之后，不再把整段正文塞进图题 */
   if(matched&&chunk.length>60&&!asset.test(chunk)){
    items.push({type:'text',value:chunk});
    items.push({type:'asset',caption:'',asset:matched});
   }else{
    items.push({type:'asset',caption:chunk,asset:matched});
   }
   return;
  }
  if(/^注\s*[:：]/.test(chunk)&&items.length&&items[items.length-1].type==='asset'){items[items.length-1].note=chunk;return;}
  if(circled.test(chunk)){bucket().push({type:'circ',value:chunk});return;}
  items.push({type:'text',value:chunk});
 });
 const tagRow=/^(定性描述|定量指标|目标设定)[:：]\s*/;
 const rowPara=value=>{const m=String(value||'').match(tagRow);return m?`<p class="kd-tagrow"><b>${esc(m[1])}</b><span>${esc(String(value).slice(m[0].length))}</span></p>`:para(value,esc);};
 /* 逐项渲染；连续的①②③圆号条目收进一张清单，不再散成段落 */
 const renderItems=items=>{let out='',ul=false;const closeUl=()=>{if(ul){out+='</ul>';ul=false;}};
  items.forEach(item=>{
   if(item.type==='asset'){closeUl();out+=guideAssetMarkup(item.asset,item.caption,esc)+(item.note?`<p class="kd-gt-note">${esc(item.note)}</p>`:'');}
   else if(item.type==='circ'){if(!ul){out+='<ul class="kd-gt-circ">';ul=true;}out+=`<li>${esc(item.value).replace(/\n/g,'<br>')}</li>`;}
   else{closeUl();out+=rowPara(item.value);}
  });
  closeUl();return out;};
 if(!nodes.length)return `<div class="kd-gt">${renderItems(lead)}</div>`;
 const body=nodes.map(node=>{
  const plain=node.items.filter(item=>item.type==='text').map(item=>item.value).join('');
  /* 正文本身就很短的节，概括等于复读，直接呈现原文 */
  const text=plain.length>=100&&digest&&digest[node.title]?digest[node.title]:'';
  return `<article class="kd-gt-node lv-${node.level}">${node.title?`<h4>${esc(node.title)}</h4>`:''}${text?`<p class="kd-gt-digest">${esc(text)}</p>`:''}<div class="kd-gt-body">${renderItems(node.items)}</div></article>`;
 }).join('');
 return `<div class="kd-gt">${lead.length?`<div class="kd-gt-lead">${renderItems(lead)}</div>`:''}${body}</div>`;
}
function practicalBlock(block,key,esc,renderBlock){let body='';if(block.type==='process_flow')body=processFlow(block,esc);else if(block.type==='four_pillars')body=pillarGrid(block,esc);else if(block.type==='card_grid')body=cardGrid(block,esc);else if(block.type==='external')body=externalGrid(block,esc);else if(block.type==='guidance')body=structuredGuidance(block.content_cn||block.content||'',esc);else{const next={...block,content_cn:block.content_cn||block.content||''};delete next.content;body=renderBlock(next,key);}body+=refs(block,esc);const role=String(block.presentation||'').replace(/[^a-z0-9_-]/gi,'');if(!role)return body;return `<section class="kd-visual-block is-${esc(role)}">${block.heading?`<h4>${esc(block.heading)}</h4>`:''}${body}</section>`;}
function provenanceMeta(layer,blocks){
 if(layer==='original')return{key:'official',label:'官方原文'};
 if(layer==='guide')return{key:'guide',label:'官方指南'};
 const values=(blocks||[]).map(block=>String(block.provenance||'').trim()).filter(Boolean);
 if(values.includes('ai_assistance')||values.length<(blocks||[]).length)return{key:'ai',label:'AI辅助梳理'};
 if(values.every(value=>value==='authority_explanation'))return{key:'authority',label:'权威标准解读'};
 if(values.every(value=>value==='official'||value==='official_guidance'))return{key:'official',label:'官方内容'};
 if(values.every(value=>value==='knowledge_note'))return{key:'curated',label:''};
 return{key:'mixed',label:'多来源整理'};
}
function sectionCard(section,index,layer,esc,renderBlock,guideAssets){
 const allBlocks=(section.blocks||[]),block=allBlocks[0]||{},meta=provenanceMeta(layer,allBlocks),label=meta.label;
 let body='',hasFigure=false;
if(layer==='original'&&allBlocks.length>1){body=allBlocks.map((b,bi)=>(b.exchangeVariants||[]).length?officialBlock(b,`official-${index}-${bi}`,esc,renderBlock,section.title):practicalBlock(b,`practice-${index}-${bi}`,esc,renderBlock)).join('');}
 else if(layer==='original')body=officialBlock(block,`official-${index}`,esc,renderBlock,section.title);
 else if(layer==='guide'){
  const guideText=blk=>{const original=blk.content_cn||blk.content||'',source=String(blk.source||'').trim(),cleanedFigure=stripFigureNotice(original),cleaned=source&&cleanedFigure.startsWith(source)?cleanedFigure.slice(source.length).replace(/^[:：\s]+/,'').trim():cleanedFigure;hasFigure=hasFigure||cleanedFigure!==original;return guideVisual(cleaned,esc,guideAssets,blk.digest||{})+refs(blk,esc);};
  if(allBlocks.length>1)body=allBlocks.map((b,bi)=>['process_flow','card_grid','four_pillars','external'].includes(b.type)?practicalBlock(b,`guide-vis-${index}-${bi}`,esc,renderBlock):guideText(b)).join('');
  else body=guideText(block);
 }else body=allBlocks.length>1?allBlocks.map((b,bi)=>practicalBlock(b,`practice-${index}-${bi}`,esc,renderBlock)).join(''):practicalBlock(block,`practice-${index}`,esc,renderBlock);
 const notes=[];
 if(layer==='practical')allBlocks.forEach(b=>{if(b.source&&!notes.includes(b.source))notes.push(b.source);});
 if(hasFigure)notes.push('原件包含表格、图示或公式；本页呈现已核对正文，表图结构请按原件入口核对。');
 const sourceTip=notes.length?` title="${esc(notes.join(' '))}"`:'';
const sourceLine=layer==='guide'&&block.source?`<small>${esc(block.source)}</small>`:'';
 const showLabel=layer==='practical'&&!!label;const heading=esc(section.title||block.title||`内容 ${index+1}`);return `<article class="kd-content-card kd-${layer} kd-source-${meta.key}" id="source-${index+1}"><header${sourceTip}>${showLabel?`<span class="kd-provenance">${label}</span><h3>${heading}</h3>`:`<h3>${heading}</h3>`}${sourceLine}</header><div class="kd-card-body">${body}</div></article>`;
}
const layerDisplayTitle=(meta,layer)=>layer==='practical'?String(meta.title||'').replace(/\s*·\s*核心内容\s*$/,''):String(meta.title||'');
function layerSection(layer,sections,esc,renderBlock,guideAssets,meta){if(!sections.length)return'';meta=meta||sourceLayers[layer];let lastGroup='';const list=sections.map(({section,index})=>{const group=String(section.groupTitle||'').trim(),head=group&&group!==lastGroup?`<div class="kd-group-head"><span>${esc(group)}</span></div>`:'';if(group)lastGroup=group;return head+sectionCard(section,index,layer,esc,renderBlock,guideAssets);}).join('');const eyebrow=layer==='practical'?'':meta.eyebrow,desc=layer==='practical'?'':meta.desc,title=layerDisplayTitle(meta,layer);return `<section class="kd-sec" id="${layer}"><header>${eyebrow?`<span>${esc(eyebrow)}</span>`:''}${title?`<h2>${esc(title)}</h2>`:''}${desc?`<p>${esc(desc)}</p>`:''}</header><div class="kd-layer-list">${list}</div></section>`;}
function kpiOverview(sections,esc){if(!sections.length)return'';const count=sections.length,columns=count===1?1:count===2?2:count===3||count===6||count===9?3:count===4||count===7||count===8?4:5;return `<nav class="kd-kpi-overview cols-${columns}" aria-label="本页关键绩效指标">${sections.map(({section,index})=>{const title=String(section.title||''),match=title.match(/^([AB]\d+(?:\.\d+)?)\s*(.*)$/),code=match?.[1]||String(index+1).padStart(2,'0'),name=match?.[2]||title;return `<a href="#source-${index+1}"><b>${esc(code)}</b><span>${esc(name)}</span></a>`;}).join('')}</nav>`;}
function relationData(relations){if(Array.isArray(relations))return{internal:relations,external:[]};return{internal:relations?.internal||[],external:relations?.external||[]};}
function relationSection(relations,standard,allItems,href,esc){const data=relationData(relations),itemMap=Object.fromEntries(allItems.map(item=>[item.id,item]));if(!data.internal.length&&!data.external.length)return'';return `<section class="kd-sec" id="relations"><header><span>知识关联</span><h2>相关文件</h2><p>与本页直接关联的准则与指南，点击进入</p></header>${data.internal.length?`<div class="kd-rel-list">${data.internal.map(value=>{const id=typeof value==='string'?'':value.id,title=typeof value==='string'?value:value.title,cross=typeof value==='object'&&value.standard&&value.standard!==standard.id,item=cross?null:itemMap[id];const url=id?href('topic.html',{standard:cross?value.standard:standard.id,id}):'';return url?`<a${cross?' class="is-cross"':''} href="${url}"><b>${esc(title||item?.title||'')}</b>${value.system?`<em>${esc(value.system)}</em>`:''}<span>查看 →</span></a>`:`<article><b>${esc(title)}</b></article>`;}).join('')}</div>`:''}${data.external.length?`<div class="kd-rel-tags">${data.external.map(value=>{const title=typeof value==='string'?value:value.title||'',url=typeof value==='object'&&value.url?value.url:'';return url?`<a href="${esc(url)}" target="_blank" rel="noreferrer"><i>${esc(title)}</i> ↗</a>`:`<i>${esc(title)}</i>`;}).join('')}</div>`:''}</section>`;}
function csaQuickSection(sections,esc){const find=t=>sections.find(s=>(s.title_cn||s.title||'')===t);const pos=find('标准定位'),struct=find('评估结构'),topics=find('关注主题'),tips=find('使用提示');if(!pos&&!struct&&!topics&&!tips)return'';const textOf=s=>(s?.blocks||[]).map(b=>b.content_cn||b.content||'').filter(Boolean);const row=(label,items,chippy)=>{items=chippy?items.filter(t=>!/[：:]$/.test(t)):items;if(!items.length)return'';const long=items.length===1&&items[0].length>26;return `<div class="kd-quick-row"><b>${esc(label)}</b><div>${long?`<p>${esc(items[0])}</p>`:`<div class="kd-quick-chips">${items.map(t=>`<i>${esc(t)}</i>`).join('')}</div>`}</div></div>`;};return `<section class="kd-sec" id="quick"><header><span>标准速览</span><h2>评估框架一览</h2></header><div class="kd-quick-panel">${row('标准定位',textOf(pos),false)}${row('评估结构',textOf(struct),true)}${row('关注主题',textOf(topics),true)}${tips?`<p class="kd-quick-tip">${esc(textOf(tips)[0]||'')}</p>`:''}</div></section>`;}
function questionGroupsSection(detail,esc,renderBlock,rich){const groups=detail.questionGroups||[];const total=groups.reduce((sum,g)=>sum+(g.questions||[]).length,0);if(!total)return'';const layoutHtml=(value,key)=>{const segs=String(value||'').split(/(<table[\s\S]*?<\/table>)/);let html='';segs.forEach((seg,si)=>{if(/^<table/i.test(seg)){html+=`<div class="st-fill">${rich(seg)}<small class="st-fill-note">表格空白格为问卷填写区</small></div>`;return;}const lines=seg.split('\n');let para=[],opts=[];const flushOpt=()=>{if(opts.length){html+=`<ul class="st-opts">${opts.map(o=>`<li>${esc(o)}</li>`).join('')}</ul>`;opts=[];}};const flushPara=()=>{if(para.length){html+=renderBlock({type:'text',content_cn:para.join('\n')},key+'-p'+si);para=[];}};lines.forEach(line=>{const t=line.trim();if(!t)return;if(/^•/.test(t)){flushPara();opts.push(t.replace(/^•\s*/,''));}else if(/^□/.test(t)){flushPara();flushOpt();html+=`<label class="st-ck"><i></i><span>${esc(t.replace(/^□\s*/,''))}</span></label>`;}else{flushOpt();para.push(line);}});flushPara();flushOpt();});return html;};const guideHtml=(q,key)=>{const parts=[['定义与指引',q.guidance],['数据要求',q.dataRequirements],['披露要求',q.disclosure],['参考资料',q.references]].filter(([,v])=>v);if(!parts.length)return'';return `<details class="st-guide"><summary>填报指引与数据要求</summary><div class="st-guide-body">${parts.map(([label,value],fi)=>`<section><h4>${esc(label)}</h4>${layoutHtml(value,key+'-g'+fi)}</section>`).join('')}</div></details>`;};return `<section class="st-question-section" id="questions"><header class="st-section-heading"><div><span>问题组与证据</span><h2>评估问题与数据要求</h2></div><p>${groups.length} 个关注主题 · ${total} 个问题</p></header><div class="st-question-groups">${groups.map((g,gi)=>`<details class="st-qgroup"${gi===0?' open':''}><summary><span class="st-g-no">${String(gi+1).padStart(2,'0')}</span><b>${esc(g.title)}</b><small>${(g.questions||[]).length} 个问题</small><i class="st-caret"></i></summary><div class="st-g-body">${(g.questions||[]).map((q,qi)=>`<details class="st-question"><summary><span class="st-q-no">${gi+1}.${qi+1}</span><span class="st-q-title">${esc(q.title||q.subtopic||'评估问题')}</span><i class="st-caret"></i></summary><div class="st-question-body">${layoutHtml(q.layout,`q-${gi}-${qi}`)}${guideHtml(q,`q-${gi}-${qi}`)}</div></details>`).join('')}</div></details>`).join('')}</div></section>`;}

function sourcesSection(standard,primaryUrl,esc){const files=standard.officialFiles||[],exchange=['ashare','hkex'].includes(standard.id),note=standard.id==='mof'?'页面按准则原文与应用指南分层；征求意见稿内容尚未生效，正式披露请核对财政部现行文件。':exchange?'页面将交易所原文、官方编制指南、权威标准解读和 AI 辅助梳理分层标识；正式披露请核对适用交易所与现行文件。':'页面将官方内容、权威标准解读、整理性说明和 AI 辅助梳理分层标识；句末“原文”可悬浮核对，正式工作请回到发布机构现行文件。';return `<section class="kd-sources" id="sources"><span>来源与版本</span><h2>官方发布文件</h2><div class="kd-file-list">${files.map(file=>`<a class="${file.url===primaryUrl?'is-current':''}" href="${esc(file.url)}" target="_blank" rel="noreferrer"><b>${esc(file.name)}</b><small>${file.url===primaryUrl?'本页主要条文来源':'查看官方文件'} ↗</small></a>`).join('')}</div><p>${note}</p></section>`;}
window.renderKnowledgeDetailV3=function({standard,item,group,detail,sections,relations,guideAssets=[],esc,renderBlock,rich,href}){const L=hubLayers[standard.id]||(standard.id==='mof'?mofLayers:sourceLayers),visualMode=String(detail.visualMode||'').replace(/[^a-z0-9_-]/gi,'');mofLevel=standard.id==='mof';const systemBackLabel={'mof':'财政部准则体系','ashare':'A股知识体系','hkex':'港交所ESG体系','csa':'标普全球CSA','gri':'GRI 标准','sasb':'SASB 行业标准','ifrs':'ISSB 准则体系','ecovadis':'EcoVadis 方法论','guozheng':'国证 ESG 体系','sbti':'SBTi 科学碳目标','ghg':'GHG Protocol 核算体系','tcfd':'TCFD 气候披露','cdp':'CDP 披露与评分','assurance':'ESG 鉴证与审验','tnfd':'TNFD 自然披露','esrs':'欧盟 ESRS','sustainalytics':'Sustainalytics ESG风险评级','cass':'CASS-ESG 指南','oecd':'OECD 负责任商业行为','iso26000':'ISO 26000 社会责任指南','csddd':'CSDDD 尽调指令','eubr':'欧盟电池法规','eudr':'欧盟零毁林法规'};const statusText=String(detail.status||item.status||'').trim();const statusBadge=standard.id==='mof'&&statusText?`<b class="kd-status${/征求意见/.test(statusText)?' is-draft':' is-live'}">${esc(statusText)}</b>`:'';const normalizeLayer=value=>['original','guide'].includes(value)?value:'practical',visibleSections=visualMode==='kpi-workbook'?sections.filter(section=>section.id!=='知识点总览'):sections,indexed=visibleSections.map((section,index)=>({section,index,layer:normalizeLayer(section.learningLayer||(section.blocks||[])[0]?.learningLayer||'practical')})),byLayer=layer=>indexed.filter(value=>value.layer===layer),allItems=(standard.groups||[]).flatMap(current=>current.items||[]),relationInfo=relationData(relations),presentLayers=new Set(indexed.map(value=>value.layer)),sectionToc=indexed.length>=4?indexed.map(({section,index})=>[`source-${index+1}`,section.title]):null,toc=(visualMode==='kpi-workbook'?indexed.map(({section,index})=>[`source-${index+1}`,section.title]):sectionToc||(standard.id==='csa'?[['quick','标准速览']]:[['original',L.original.eyebrow],['guide',L.guide.eyebrow],['practical',layerDisplayTitle(L.practical,'practical')]].filter(([id])=>presentLayers.has(id)))).concat([['questions','问题组与证据'],['relations','相关文件']]).filter(([id])=>id==='relations'?relationInfo.internal.length||relationInfo.external.length:id==='questions'?(detail.questionGroups||[]).some(g=>(g.questions||[]).length):true);return `<div class="kd-page" data-system="${esc(standard.id)}"${visualMode?` data-layout="${esc(visualMode)}"`:''}${indexed.length>=9?' data-density="long"':''}><div class="kd-shell"><main class="kd-main"><nav class="kd-crumb"><a href="${href('standard.html',{id:standard.id})}">${esc(standard.title)}</a>${visualMode?'':`<span>/</span><b>${esc(group?.title||'')}</b>`}</nav><header class="kd-head">${visualMode?'':`<span>${esc(detail.eyebrow||item.eyebrow||'披露议题')}${statusBadge}</span>`}<h1>${esc(detail.title||item.title)}</h1><p>${esc(item.summary||detail.summary||'')}</p></header>${visualMode==='kpi-workbook'?kpiOverview(indexed,esc):''}${standard.id==='csa'?csaQuickSection(sections,esc):layerSection('original',byLayer('original'),esc,renderBlock,guideAssets,L.original)+layerSection('guide',byLayer('guide'),esc,renderBlock,guideAssets,L.guide)+layerSection('practical',byLayer('practical'),esc,renderBlock,guideAssets,L.practical)}${questionGroupsSection(detail,esc,renderBlock,rich)}${relationSection(relations,standard,allItems,href,esc)}${detail.translationNote?`<p class="kd-translation-note">${esc(detail.translationNote)}</p>`:''}</main><aside class="kd-sidebar"><a class="kd-back" href="${href('standard.html',{id:standard.id})}">← 返回${esc(systemBackLabel[standard.id]||standard.title)}</a><span>本页目录</span><nav>${toc.map(([id,label])=>`<a href="#${id}">${esc(label)}</a>`).join('')}</nav></aside></div></div>`;};
window.bindKnowledgeDetailV3=function(root){root.querySelectorAll('[data-kd-rule]').forEach(card=>{const buttons=[...card.querySelectorAll('[data-kd-exchange]')],panels=[...card.querySelectorAll('[data-kd-panel]')];buttons.forEach(button=>button.addEventListener('click',()=>{buttons.forEach(item=>item.setAttribute('aria-selected',String(item===button)));panels.forEach(panel=>{panel.hidden=panel.dataset.kdPanel!==button.dataset.kdExchange;});}));});};
/* —— 悬浮显示原文：全局单例浮层 —— */
let kdTipEl=null,kdTipTimer=0,kdTipBtn=null;
function kdTipBuild(data){
 if(!kdTipEl){kdTipEl=document.createElement('div');kdTipEl.className='kd-qtip';document.body.appendChild(kdTipEl);}
 const related=data.related&&data.related.text?`<div class="kd-qtip-related"><b>${escAttr(data.related.label||'关联知识')}</b><p>${escAttr(data.related.text)}</p>${data.related.source?`<small class="kd-qtip-src">${escAttr(data.related.source)}</small>`:''}${data.related.url?`<a href="${escAttr(data.related.url)}">查看该知识页 →</a>`:''}</div>`:'';
 kdTipEl.innerHTML=`<span class="kd-qtip-tag">官方原文</span><p class="kd-qtip-text" lang="en">${escAttr(data.text)}</p>${data.source?`<small class="kd-qtip-src">${escAttr(data.source)}</small>`:''}${related}`;
}
function kdTipShow(btn){
 const data=quoteStore.get(btn.getAttribute('data-qid'));
 if(!data)return;
 clearTimeout(kdTipTimer);
 kdTipBuild(data);
 const r=btn.getBoundingClientRect(),w=kdTipEl.offsetWidth,h=kdTipEl.offsetHeight;
 let left=r.left+r.width/2-w/2;
 left=Math.max(12,Math.min(left,window.innerWidth-w-12));
 let top=r.bottom+10;
 if(top+h>window.innerHeight-14&&r.top-h-10>10)top=r.top-h-10;
 top=Math.max(12,Math.min(top,window.innerHeight-h-12));
 kdTipEl.style.left=left+'px';kdTipEl.style.top=top+'px';
 kdTipEl.classList.add('is-on');
 kdTipBtn=btn;
}
function kdTipHide(){kdTipTimer=setTimeout(()=>{if(kdTipEl)kdTipEl.classList.remove('is-on');kdTipBtn=null;},160);}
const escAttr=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
document.addEventListener('mouseover',event=>{const target=event.target;if(!(target instanceof Element))return;if(target.closest('.kd-qtip')){clearTimeout(kdTipTimer);return;}const btn=target.closest('[data-qid]');if(btn)kdTipShow(btn);else kdTipHide();},{passive:true});
document.addEventListener('focusin',event=>{const target=event.target;if(target instanceof Element&&target.matches('[data-qid]'))kdTipShow(target);});
document.addEventListener('focusout',()=>kdTipHide());
/* 滚动/缩放：悬停时收起，键盘聚焦时改为跟随重定位，保证只用键盘也能看到原文 */
function kdTipReposition(){if(kdTipBtn&&document.activeElement===kdTipBtn)kdTipShow(kdTipBtn);else if(kdTipEl)kdTipEl.classList.remove('is-on');}
document.addEventListener('scroll',kdTipReposition,{passive:true,capture:true});
window.addEventListener('resize',kdTipReposition,{passive:true});
window.addEventListener('kd:layout',kdTipReposition);
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(kdTipEl)kdTipEl.classList.remove('is-on');kdTipBtn=null;}});
})();
