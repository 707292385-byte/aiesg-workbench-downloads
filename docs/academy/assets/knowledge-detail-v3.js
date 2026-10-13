(function(){'use strict';
const para=(value,esc)=>String(value||'').split(/\n{2,}/).map(part=>`<p>${esc(part.trim()).replace(/\n/g,'<br>')}</p>`).join('');
const stripFigureNotice=value=>String(value||'').replace(/\n*完整图表、公式见官方原件：[\s\S]*$/,'').trim();
const mofLayers={
 original:{eyebrow:'准则原文',title:'准则条款原文',desc:'按章与条呈现准则正文，条款号保留原文表述。'},
 guide:{eyebrow:'应用指南',title:'官方应用指南原文',desc:'按指南原有标题与条款结构呈现，逐节给出概括。'},
 practical:{eyebrow:'理解与实务',title:'权威标准辅助解读与实务提示',desc:'优先引用权威来源；没有直接来源时才标为 AI 辅助建议。'}
};
const sourceLayers={
 original:{eyebrow:'指引原文',title:'交易所指引的正式披露要求',desc:'按沪、深、北三所查看对应条文；有可逐段对应的官方英文时，在中文段末显示 EN。'},
 guide:{eyebrow:'编制指南',title:'官方指南对相应内容的说明',desc:'按指南原有标题和段落转为流程、分组与资料卡；文字顺序和来源身份保持不变。'},
 practical:{eyebrow:'理解与实务',title:'权威标准辅助解读与实务提示',desc:'优先引用 GRI、OECD 等权威来源；没有直接来源时才标为 AI 辅助建议。'}
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
     practical:{eyebrow:'理解与实务',title:'权威标准辅助解读与实务提示',desc:'优先引用权威来源；没有直接来源时才标为 AI 辅助建议。'}}
};
function refs(block,esc){const items=block.references||[];if(!items.length)return'';return `<div class="kd-refs"><span>依据</span>${items.map(item=>`<a href="${esc(item.url||'#')}" target="_blank" rel="noreferrer">${esc(item.title||item.id||'参考来源')}${item.locator?` · ${esc(item.locator)}`:''} ↗</a>`).join('')}</div>`;}
function englishPair(chinese,english,esc){return `<div class="bilingual"><div class="cn-content">${para(chinese,esc)}</div>${english?`<button class="en-trigger" type="button" aria-expanded="false">EN</button><div class="en-popover" lang="en">${para(english,esc)}</div>`:''}</div>`;}
function officialBlock(block,key,esc,renderBlock,sectionTitle){const variants=block.exchangeVariants||[];if(!variants.length)return renderBlock(block,key);const order={SSE:0,SZSE:1,BSE:2},short={SSE:'上交所',SZSE:'深交所',BSE:'北交所'};variants.sort((a,b)=>(order[a.exchange]??9)-(order[b.exchange]??9));const groups=[];variants.forEach(item=>{const g=groups.find(x=>x.exchange===item.exchange);if(g)g.items.push(item);else groups.push({exchange:item.exchange,items:[item]});});const preferred=groups.findIndex(g=>g.exchange==='SSE'),active=preferred<0?0:preferred;const titleIsArticle=/^第[一二三四五六七八九十百]+条$/.test(String(sectionTitle||''));const tabs=`<div class="kd-exchange-tabs" role="tablist" aria-label="查看交易所依据">${groups.map((g,index)=>`<button type="button" role="tab" data-kd-exchange="${esc(g.exchange)}" aria-selected="${index===active}">${esc(short[g.exchange]||g.items[0].exchangeName)}</button>`).join('')}</div>`;const itemHtml=(item,first)=>`<div class="kd-rule-item"><div class="kd-rule-meta">${item.article&&!titleIsArticle?`<b>第${esc(item.article)}条</b>`:''}${item.comparisonStatus==='identical'?'<i>三所正文一致</i>':''}${first?tabs:''}</div>${englishPair(item.content||block.content_cn,item.officialEnglish?.content||'',esc)}<div class="kd-source-line">${item.sourceUrl?`<a href="${esc(item.sourceUrl)}" target="_blank" rel="noreferrer">中文原件 ↗</a>`:''}${item.officialEnglish?.sourceUrl?`<a href="${esc(item.officialEnglish.sourceUrl)}" target="_blank" rel="noreferrer">英文原件 ↗</a>`:''}${item.englishBindingNote?`<span title="${esc(item.englishBindingNote)}">英文版本说明 ⓘ</span>`:''}</div></div>`;return `<div class="kd-rule-card" data-kd-rule>${groups.map((g,index)=>`<section class="kd-exchange-panel" data-kd-panel="${esc(g.exchange)}"${index===active?'':' hidden'}>${g.items.map((item,i)=>itemHtml(item,i===0)).join('')}</section>`).join('')}</div>`;}
function processFlow(block,esc){const br=value=>esc(value).replace(/\n/g,'<br>');if(block.layout==='v')return `<div class="kd-flow kd-flow-v">${(block.steps||[]).map((step,index)=>`<article><span>${esc(step.icon||index+1)}</span><b>${esc(step.title)}</b><p>${br(step.desc)}</p></article>`).join('')}</div>`;return `<div class="kd-flow">${(block.steps||[]).map((step,index)=>`<article><span>${esc(step.icon||index+1)}</span><div><b>${esc(step.title)}</b><p>${br(step.desc)}</p></div></article>`).join('')}</div>`;}
function pillarGrid(block,esc){const no=block.numbered!==false,cols=block.cols?' cols-'+block.cols:'';return `<div class="kd-pillars${cols}">${(block.pillars||[]).map((item,index)=>`<article>${no?`<span>${String(index+1).padStart(2,'0')}</span>`:''}<b>${esc(item.title)}</b><p>${esc(item.desc)}</p>${item.items?.length?`<ul>${item.items.map(value=>`<li>${esc(value)}</li>`).join('')}</ul>`:''}</article>`).join('')}</div>`;}
function cardGrid(block,esc){const no=block.numbered!==false,cols=block.cols?' cols-'+block.cols:'';return `${block.title?`<p class="kd-grid-title">${esc(block.title)}</p>`:''}<div class="kd-card-grid${cols}">${(block.cards||[]).map((item,index)=>`<article>${no?`<span>${String(index+1).padStart(2,'0')}</span>`:''}${item.title?`<b>${esc(item.title)}</b>`:''}${item.content?`<p>${esc(item.content)}</p>`:''}${item.items?.length?`<ul>${item.items.map(value=>`<li>${esc(value)}</li>`).join('')}</ul>`:''}${item.after?`<p class="kd-card-after">${esc(item.after)}</p>`:''}</article>`).join('')}</div>`;}
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
function practicalBlock(block,key,esc,renderBlock){let body='';if(block.type==='process_flow')body=processFlow(block,esc);else if(block.type==='four_pillars')body=pillarGrid(block,esc);else if(block.type==='card_grid')body=cardGrid(block,esc);else if(block.type==='external')body=externalGrid(block,esc);else if(block.type==='guidance')body=structuredGuidance(block.content_cn||block.content||'',esc);else{const next={...block,content_cn:block.content_cn||block.content||''};delete next.content;body=renderBlock(next,key);}return body+refs(block,esc);}
function sectionCard(section,index,layer,esc,renderBlock,guideAssets){
 const allBlocks=(section.blocks||[]),block=allBlocks[0]||{},provenance=block.provenance||'';
 const label=layer==='original'?'指引原文':layer==='guide'?'官方编制指南':provenance==='authority_explanation'?'权威标准辅助解读':provenance==='ai_assistance'?'AI辅助建议':'条文结构化整理';
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
 const hoverNote=notes.length?`<button class="kd-meta-note" type="button" title="${esc(notes.join(' '))}" aria-label="查看来源与呈现说明">ⓘ</button>`:'';
const sourceLine=layer==='guide'&&block.source?`<small>${esc(block.source)}</small>`:'';
const showLabel=layer==='practical';const heading=esc(section.title||block.title||`内容 ${index+1}`);return `<article class="kd-content-card kd-${layer}" id="source-${index+1}"><header>${showLabel?`<span>${label}${hoverNote}</span><h3>${heading}</h3>`:`<h3>${heading}${hoverNote}</h3>`}${sourceLine}</header><div class="kd-card-body">${body}</div></article>`;
}
function layerSection(layer,sections,esc,renderBlock,guideAssets,meta){if(!sections.length)return'';meta=meta||sourceLayers[layer];let lastGroup='';const list=sections.map(({section,index})=>{const group=String(section.groupTitle||'').trim(),head=group&&group!==lastGroup?`<div class="kd-group-head"><span>${esc(group)}</span></div>`:'';if(group)lastGroup=group;return head+sectionCard(section,index,layer,esc,renderBlock,guideAssets);}).join('');return `<section class="kd-sec" id="${layer}"><header><span>${meta.eyebrow}</span><h2>${meta.title}</h2><p>${meta.desc}</p></header><div class="kd-layer-list">${list}</div></section>`;}
function relationData(relations){if(Array.isArray(relations))return{internal:relations,external:[]};return{internal:relations?.internal||[],external:relations?.external||[]};}
function relationSection(relations,standard,allItems,href,esc){const data=relationData(relations),itemMap=Object.fromEntries(allItems.map(item=>[item.id,item]));if(!data.internal.length&&!data.external.length)return'';return `<section class="kd-sec" id="relations"><header><span>知识关联</span><h2>相关文件</h2><p>与本页直接关联的准则与指南，点击进入</p></header>${data.internal.length?`<div class="kd-rel-list">${data.internal.map(value=>{const id=typeof value==='string'?'':value.id,title=typeof value==='string'?value:value.title,item=itemMap[id];return item?`<a href="${href('topic.html',{standard:standard.id,id})}"><b>${esc(title||item.title)}</b><span>查看 →</span></a>`:`<article><b>${esc(title)}</b></article>`;}).join('')}</div>`:''}${data.external.length?`<div class="kd-rel-tags">${data.external.map(value=>`<i>${esc(typeof value==='string'?value:value.title||'')}</i>`).join('')}</div>`:''}</section>`;}
function csaQuickSection(sections,esc){const find=t=>sections.find(s=>(s.title_cn||s.title||'')===t);const pos=find('标准定位'),struct=find('评估结构'),topics=find('关注主题'),tips=find('使用提示');if(!pos&&!struct&&!topics&&!tips)return'';const textOf=s=>(s?.blocks||[]).map(b=>b.content_cn||b.content||'').filter(Boolean);const row=(label,items,chippy)=>{items=chippy?items.filter(t=>!/[：:]$/.test(t)):items;if(!items.length)return'';const long=items.length===1&&items[0].length>26;return `<div class="kd-quick-row"><b>${esc(label)}</b><div>${long?`<p>${esc(items[0])}</p>`:`<div class="kd-quick-chips">${items.map(t=>`<i>${esc(t)}</i>`).join('')}</div>`}</div></div>`;};return `<section class="kd-sec" id="quick"><header><span>标准速览</span><h2>评估框架一览</h2></header><div class="kd-quick-panel">${row('标准定位',textOf(pos),false)}${row('评估结构',textOf(struct),true)}${row('关注主题',textOf(topics),true)}${tips?`<p class="kd-quick-tip">${esc(textOf(tips)[0]||'')}</p>`:''}</div></section>`;}
function questionGroupsSection(detail,esc,renderBlock,rich){const groups=detail.questionGroups||[];const total=groups.reduce((sum,g)=>sum+(g.questions||[]).length,0);if(!total)return'';const layoutHtml=(value,key)=>{const segs=String(value||'').split(/(<table[\s\S]*?<\/table>)/);let html='';segs.forEach((seg,si)=>{if(/^<table/i.test(seg)){html+=`<div class="st-fill">${rich(seg)}<small class="st-fill-note">表格空白格为问卷填写区</small></div>`;return;}const lines=seg.split('\n');let para=[],opts=[];const flushOpt=()=>{if(opts.length){html+=`<ul class="st-opts">${opts.map(o=>`<li>${esc(o)}</li>`).join('')}</ul>`;opts=[];}};const flushPara=()=>{if(para.length){html+=renderBlock({type:'text',content_cn:para.join('\n')},key+'-p'+si);para=[];}};lines.forEach(line=>{const t=line.trim();if(!t)return;if(/^•/.test(t)){flushPara();opts.push(t.replace(/^•\s*/,''));}else if(/^□/.test(t)){flushPara();flushOpt();html+=`<label class="st-ck"><i></i><span>${esc(t.replace(/^□\s*/,''))}</span></label>`;}else{flushOpt();para.push(line);}});flushPara();flushOpt();});return html;};const guideHtml=(q,key)=>{const parts=[['定义与指引',q.guidance],['数据要求',q.dataRequirements],['披露要求',q.disclosure],['参考资料',q.references]].filter(([,v])=>v);if(!parts.length)return'';return `<details class="st-guide"><summary>填报指引与数据要求</summary><div class="st-guide-body">${parts.map(([label,value],fi)=>`<section><h4>${esc(label)}</h4>${layoutHtml(value,key+'-g'+fi)}</section>`).join('')}</div></details>`;};return `<section class="st-question-section" id="questions"><header class="st-section-heading"><div><span>问题组与证据</span><h2>评估问题与数据要求</h2></div><p>${groups.length} 个关注主题 · ${total} 个问题</p></header><div class="st-question-groups">${groups.map((g,gi)=>`<details class="st-qgroup"${gi===0?' open':''}><summary><span class="st-g-no">${String(gi+1).padStart(2,'0')}</span><b>${esc(g.title)}</b><small>${(g.questions||[]).length} 个问题</small><i class="st-caret"></i></summary><div class="st-g-body">${(g.questions||[]).map((q,qi)=>`<details class="st-question"><summary><span class="st-q-no">${gi+1}.${qi+1}</span><span class="st-q-title">${esc(q.title||q.subtopic||'评估问题')}</span><i class="st-caret"></i></summary><div class="st-question-body">${layoutHtml(q.layout,`q-${gi}-${qi}`)}${guideHtml(q,`q-${gi}-${qi}`)}</div></details>`).join('')}</div></details>`).join('')}</div></section>`;}

function sourcesSection(standard,primaryUrl,esc){const files=standard.officialFiles||[];return `<section class="kd-sources" id="sources"><span>来源与版本</span><h2>官方发布文件</h2><div class="kd-file-list">${files.map(file=>`<a class="${file.url===primaryUrl?'is-current':''}" href="${esc(file.url)}" target="_blank" rel="noreferrer"><b>${esc(file.name)}</b><small>${file.url===primaryUrl?'本页主要条文来源':'查看官方文件'} ↗</small></a>`).join('')}</div><p>${standard.id==='mof'?'页面按「准则原文」与「应用指南」分层标识；征求意见稿内容尚未生效，正式披露请核对财政部现行文件。':'页面中的“指引原文”“官方编制指南”“权威标准辅助解读”和“AI辅助建议”已分层标识。正式披露请核对适用交易所与现行文件。'}</p></section>`;}
window.renderKnowledgeDetailV3=function({standard,item,group,detail,sections,relations,guideAssets=[],esc,renderBlock,rich,href}){const L=hubLayers[standard.id]||(standard.id==='mof'?mofLayers:sourceLayers);mofLevel=standard.id==='mof';const systemColor={'gri':'#2f7d4f','sasb':'#1f6f6b','ifrs':'#12508f','ecovadis':'#0f7c8c','guozheng':'#8a2e2e'};const systemBackLabel={'mof':'财政部准则体系','ashare':'A股知识体系','hkex':'港交所ESG体系','csa':'标普全球CSA','gri':'GRI 标准','sasb':'SASB 行业标准','ifrs':'ISSB 准则体系','ecovadis':'EcoVadis 方法论','guozheng':'国证 ESG 体系'};const statusText=String(detail.status||item.status||'').trim();const statusBadge=standard.id==='mof'&&statusText?`<b class="kd-status${/征求意见/.test(statusText)?' is-draft':' is-live'}">${esc(statusText)}</b>`:'';const indexed=sections.map((section,index)=>({section,index})),byLayer=layer=>indexed.filter(value=>(value.section.learningLayer||(value.section.blocks||[])[0]?.learningLayer||'practical')===layer),allItems=(standard.groups||[]).flatMap(current=>current.items||[]),relationInfo=relationData(relations),presentLayers=new Set(indexed.map(value=>value.section.learningLayer||(value.section.blocks||[])[0]?.learningLayer||'practical')),toc=(standard.id==='csa'?[['quick','标准速览']]:[['original',L.original.eyebrow],['guide',L.guide.eyebrow],['practical',L.practical.eyebrow]].filter(([id])=>presentLayers.has(id))).concat([['questions','问题组与证据'],['relations','相关文件'],['sources','来源与版本']]).filter(([id])=>id==='sources'?true:(id==='relations'?relationInfo.internal.length||relationInfo.external.length:id==='questions'?(detail.questionGroups||[]).some(g=>(g.questions||[]).length):true));return `<div class="kd-page" data-system="${esc(standard.id)}"><div class="kd-shell"><main class="kd-main"><nav class="kd-crumb"><a href="${href('standard.html',{id:standard.id})}">${esc(standard.title)}</a><span>/</span><b>${esc(group?.title||'')}</b></nav><header class="kd-head"><span>${esc(detail.eyebrow||item.eyebrow||'披露议题')}${statusBadge}</span><h1>${esc(detail.title||item.title)}</h1><p>${esc(item.summary||detail.summary||'')}</p></header>${standard.id==='csa'?csaQuickSection(sections,esc):layerSection('original',byLayer('original'),esc,renderBlock,guideAssets,L.original)+layerSection('guide',byLayer('guide'),esc,renderBlock,guideAssets,L.guide)+layerSection('practical',byLayer('practical'),esc,renderBlock,guideAssets,L.practical)}${questionGroupsSection(detail,esc,renderBlock,rich)}${relationSection(relations,standard,allItems,href,esc)}${sourcesSection(standard,detail.officialUrl,esc)}</main><aside class="kd-sidebar"><a class="kd-back" href="${href('standard.html',{id:standard.id})}">← 返回${esc(systemBackLabel[standard.id]||standard.title)}</a><span>本页目录</span><nav>${toc.map(([id,label])=>`<a href="#${id}">${esc(label)}</a>`).join('')}</nav><p><b>阅读顺序</b>${standard.id==='mof'?'先看准则条款，再看官方应用指南，最后查看知识关联与来源。':'先看指引义务，再看官方指南，最后查看权威标准和实务解释。'}</p></aside></div></div>`;};
window.bindKnowledgeDetailV3=function(root){root.querySelectorAll('[data-kd-rule]').forEach(card=>{const buttons=[...card.querySelectorAll('[data-kd-exchange]')],panels=[...card.querySelectorAll('[data-kd-panel]')];buttons.forEach(button=>button.addEventListener('click',()=>{buttons.forEach(item=>item.setAttribute('aria-selected',String(item===button)));panels.forEach(panel=>{panel.hidden=panel.dataset.kdPanel!==button.dataset.kdExchange;});}));});};
})();
