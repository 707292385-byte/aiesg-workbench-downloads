(function () {
  'use strict';

  const STORAGE_KEY = 'aiesg-double-materiality-v1';
  const CATEGORY_NAMES = { E: '环境', S: '社会', G: '治理' };
  const CATEGORY_COLORS = { E: '#138a61', S: '#2878b8', G: '#d48a24' };
  const DEFAULT_MATRIX_COLORS = { double: '#1f5b45', single: '#dceee3', none: '#ffffff' };
  const DEFAULT_STANDARDS = ['ashare', 'esrs'];
  const FULL_SCOPE_STANDARDS = new Set(['ashare', 'esrs', 'hkex', 'gri', 'cass']);
  const embedded = new URLSearchParams(location.search).get('embed') === '1';
  let library = null;
  let state = null;

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function pageHref(page) {
    return page + (embedded ? (page.includes('?') ? '&' : '?') + 'embed=1' : '');
  }

  function clampScore(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(5, Math.max(1, Math.round(number * 10) / 10)) : 3;
  }

  function createAssessmentId() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return 'DM-' + date + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  function emptyState() {
    return {
      step: 1,
      flowStateVersion: 4,
      companyName: '',
      industry: 'general',
      standards: DEFAULT_STANDARDS.slice(),
      selected: [],
      customTopics: [],
      names: {},
      scores: {},
      scoreOrigins: {},
      scoringStarted: false,
      scoreStateVersion: 3,
      activeScoreTopicId: '',
      notes: {},
      threshold: 3,
      matrixColors: Object.assign({}, DEFAULT_MATRIX_COLORS),
      categoryFilter: 'all',
      topicView: 'cards',
      assessmentId: createAssessmentId(),
      questionnaireVersion: 1,
      questionnaireSignature: '',
      questionnaireMap: [],
      questionnaireExportedAt: '',
      surveyImport: null
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      const loaded = parsed && typeof parsed === 'object' ? Object.assign(emptyState(), parsed) : emptyState();
      if (Number(parsed?.scoreStateVersion) !== 3) {
        loaded.scoreStateVersion = 3;
        const scoreEntries = Object.entries(loaded.scores || {});
        const untouchedPlaceholders = scoreEntries.length && scoreEntries.every(([id, scores]) => loaded.scoreOrigins?.[id] === 'internal' && Number(scores?.impact) === 3 && Number(scores?.financial) === 3 && !loaded.notes?.[id]);
        if (!loaded.surveyImport && untouchedPlaceholders) {
          loaded.scores = {};
          loaded.scoreOrigins = {};
        }
      }
      if (Number(parsed?.flowStateVersion) !== 4) {
        loaded.step = Number(parsed?.step) === 2 && (loaded.scoringStarted || loaded.surveyImport) ? 4 : 1;
        loaded.flowStateVersion = 4;
      }
      if (!['cards', 'list'].includes(loaded.topicView)) loaded.topicView = 'cards';
      loaded.matrixColors = Object.fromEntries(Object.entries(DEFAULT_MATRIX_COLORS).map(([key, fallback]) => [key, normalizeColor(loaded.matrixColors?.[key], fallback)]));
      return loaded;
    } catch (_) {
      return emptyState();
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function normalizeColor(value, fallback) {
    const color = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
  }

  function matrixColors() {
    return Object.fromEntries(Object.entries(DEFAULT_MATRIX_COLORS).map(([key, fallback]) => [key, normalizeColor(state?.matrixColors?.[key], fallback)]));
  }

  function topicMap() {
    return new Map([...library.topics, ...state.customTopics].map(topic => [topic.id, topic]));
  }

  function allTopics() {
    return [...library.topics, ...state.customTopics];
  }

  function matchesStandards(topic) {
    return topic.custom || topic.standards.some(standard => state.standards.includes(standard));
  }

  function recommendationStrength(topic) {
    if (topic.custom) return 9;
    let value = topic.standards.filter(item => state.standards.includes(item)).length;
    if (topic.industries.includes(state.industry)) value += 3;
    if (topic.industries.includes('general')) value += 1;
    return value;
  }

  function hasFullScopeStandard(topic) {
    return topic.standards.some(standard => state.standards.includes(standard) && FULL_SCOPE_STANDARDS.has(standard));
  }

  function topicRecommendationLabel(topic) {
    if (state.industry !== 'general' && topic.industries.includes(state.industry)) return '行业重点';
    if (topic.industries.includes('general')) return '通用基础';
    return hasFullScopeStandard(topic) ? '标准覆盖' : '行业相关';
  }

  function recommendedIds() {
    return library.topics
      .filter(matchesStandards)
      .filter(topic => hasFullScopeStandard(topic)
        || state.industry === 'general'
        || topic.industries.includes(state.industry)
        || topic.industries.includes('general'))
      .sort((left, right) => recommendationStrength(right) - recommendationStrength(left) || right.impact + right.financial - left.impact - left.financial)
      .map(topic => topic.id);
  }

  function ensureScores(topic, baseline) {
    if (!state.scores[topic.id]) {
      state.scores[topic.id] = {
        impact: baseline == null ? null : clampScore(baseline),
        financial: baseline == null ? null : clampScore(baseline)
      };
    }
    return state.scores[topic.id];
  }

  function topicScores(topic) {
    const scores = state.scores[topic.id];
    return scores && typeof scores === 'object' ? scores : null;
  }

  function validScore(value) {
    return value !== null && value !== '' && Number.isFinite(Number(value));
  }

  function completeScores(topic) {
    const scores = topicScores(topic);
    return Boolean(scores && validScore(scores.impact) && validScore(scores.financial));
  }

  function scoredTopics() {
    return selectedTopics().filter(completeScores);
  }

  function allScoresComplete() {
    const topics = selectedTopics();
    return Boolean(topics.length && topics.every(completeScores));
  }

  function canOpenScores() {
    return Boolean(state.scoringStarted || state.surveyImport);
  }

  function applyRecommendations() {
    const customSelected = state.selected.filter(id => state.customTopics.some(topic => topic.id === id));
    state.selected = [...new Set([...recommendedIds(), ...customSelected])];
    saveState();
  }

  function selectedTopics() {
    const map = topicMap();
    return state.selected.map(id => map.get(id)).filter(Boolean);
  }

  function displayName(topic) {
    return state.names[topic.id] || topic.name;
  }

  function classification(topic) {
    const scores = topicScores(topic);
    if (!completeScores(topic)) return { key: 'unscored', label: '待评分' };
    const impact = scores.impact >= state.threshold;
    const financial = scores.financial >= state.threshold;
    if (impact && financial) return { key: 'double', label: '双重重要' };
    if (impact) return { key: 'impact', label: '影响重要' };
    if (financial) return { key: 'financial', label: '财务重要' };
    return { key: 'below', label: '低于阈值' };
  }

  function standardById(id) {
    return library.standards.find(item => item.id === id);
  }

  function renderHeader() {
    return '<header class="dm-header">'
      + '<div class="dm-header-top"><a class="dm-back" href="' + pageHref('community.html#co-projects') + '">← 返回项目与工具</a><span>体验版 · 浏览器自动保存</span></div>'
      + '<div class="dm-header-main"><div><span class="dm-eyebrow">DOUBLE MATERIALITY ASSESSMENT</span><h1>双重重要性评估</h1><p>从行业和披露标准形成候选议题，再用影响重要性与财务重要性完成排序和矩阵展示。</p></div></div>'
      + renderStepper()
      + '</header>';
  }

  function renderStepper() {
    const steps = [
      [1, '评估范围', '企业、行业与标准', true],
      [2, '议题清单', '分组筛选与校准', Boolean(state.standards.length)],
      [3, '问卷收集', '导出、回收与导入', Boolean(state.selected.length)],
      [4, '评分与矩阵', '复核分数与输出', Boolean(state.selected.length && canOpenScores())]
    ];
    return '<nav class="dm-hero-flow" aria-label="评估步骤">' + steps.map(item => '<button type="button" class="' + (state.step === item[0] ? 'is-active' : state.step > item[0] ? 'is-complete' : '') + '" data-step="' + item[0] + '" ' + (item[3] ? '' : 'disabled') + '><b>0' + item[0] + '</b><span><strong>' + item[1] + '</strong><small>' + item[2] + '</small></span></button>').join('') + '</nav>';
  }

  function renderCompanySetup() {
    const industries = library.industries.map(item => '<option value="' + item.id + '"' + (state.industry === item.id ? ' selected' : '') + '>' + escapeHtml(item.name) + '</option>').join('');
    const standards = library.standards.map(item => {
      const checked = state.standards.includes(item.id);
      return '<label class="dm-standard' + (checked ? ' is-selected' : '') + '" title="' + escapeHtml(item.description) + '"><input type="checkbox" name="standard" value="' + item.id + '"' + (checked ? ' checked' : '') + '><span>' + escapeHtml(item.short) + '</span><small>' + escapeHtml(item.name) + '</small></label>';
    }).join('');
    return '<section class="dm-setup dm-panel"><div class="dm-panel-head"><div><small>企业画像</small><h2>先确定评估边界</h2></div><p>行业影响推荐范围，披露标准决定议题来源。两者只是起点，最终清单仍需结合企业活动和价值链确认。</p></div>'
      + '<div class="dm-form-grid"><label><span>企业名称</span><input type="text" name="companyName" maxlength="80" placeholder="例如：某某科技股份有限公司" value="' + escapeHtml(state.companyName) + '"></label>'
      + '<label><span>所属行业</span><select name="industry">' + industries + '</select></label></div>'
      + '<fieldset class="dm-standard-field"><legend>披露标准（可多选）</legend><div class="dm-standards">' + standards + '</div></fieldset>'
      + '<div class="dm-recommend-bar"><div><strong>当前将载入 ' + recommendedIds().length + ' 个议题</strong><small>通用披露框架按现有映射完整载入并标记行业重点；SASB按行业筛选</small></div><button type="button" data-action="next-topics">生成议题清单 <span>→</span></button></div>'
      + '</section>';
  }

  function sourceTags(topic) {
    const aliases = { ashare: 'A股', esrs: 'ESRS', hkex: '港交所', gri: 'GRI', sasb: 'SASB', cass: 'CASS' };
    const fragments = String(topic.source || '').split('；');
    return topic.standards.filter(id => state.standards.includes(id)).map(id => {
      const standard = standardById(id);
      if (!standard) return '';
      const ref = topic.standardRefs?.[id] || fragments.find(fragment => fragment.includes(aliases[id]))?.replace(aliases[id], '').trim() || '相关议题';
      const title = standard.name + (topic.standardRefs?.[id] ? ' · 本工具稳定映射编号 ' : ' · ') + ref;
      return '<span class="dm-topic-ref" title="' + escapeHtml(title) + '"><b>' + escapeHtml(standard.short) + '</b><i>' + escapeHtml(ref) + '</i></span>';
    }).join('');
  }

  function renderTopicCard(topic, recommended) {
    const selected = state.selected.includes(topic.id);
    return '<article class="dm-topic dm-topic--' + topic.category.toLowerCase() + (selected ? ' is-selected' : '') + '" data-topic-card="' + topic.id + '">'
      + '<div class="dm-topic-select"><label><input type="checkbox" data-topic-select="' + topic.id + '"' + (selected ? ' checked' : '') + '><span aria-hidden="true"></span></label><b>' + escapeHtml(CATEGORY_NAMES[topic.category]) + '</b>' + (recommended ? '<small>' + topicRecommendationLabel(topic) + '</small>' : '') + '</div>'
      + '<input class="dm-topic-name" data-topic-name="' + topic.id + '" value="' + escapeHtml(displayName(topic)) + '" aria-label="修改' + escapeHtml(topic.name) + '的名称">'
      + '<p>' + escapeHtml(topic.description) + '</p><div class="dm-topic-sources">' + (topic.custom ? '<span class="dm-topic-ref"><b>企业自定义</b><i>新增议题</i></span>' : sourceTags(topic)) + '</div>'
      + '</article>';
  }

  function renderCustomTopicForm() {
    return '<form class="dm-custom-form" id="dm-custom-form"><div><span>＋ 新增行业或企业特色议题</span><small>新增后会直接加入本次评估</small></div>'
      + '<input name="topicName" maxlength="60" required placeholder="输入议题名称">'
      + '<select name="topicCategory" aria-label="议题分类"><option value="E">环境</option><option value="S">社会</option><option value="G">治理</option></select>'
      + '<input name="topicDescription" maxlength="160" placeholder="简要说明议题范围（可选）">'
      + '<button type="submit">添加议题</button></form>';
  }

  function renderTopicLibrary() {
    const recommended = new Set(recommendedIds());
    const visible = allTopics().filter(matchesStandards).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      const recommendedOrder = Number(recommended.has(b.id)) - Number(recommended.has(a.id));
      if (recommendedOrder) return recommendedOrder;
      const selectedStandard = state.standards.find(id => a.standardRefs?.[id] && b.standardRefs?.[id]);
      if (selectedStandard) return a.standardRefs[selectedStandard].localeCompare(b.standardRefs[selectedStandard], 'zh-CN', { numeric: true });
      return displayName(a).localeCompare(displayName(b), 'zh-CN');
    });
    const selectedCount = state.selected.length;
    const groups = ['E', 'S', 'G'].map(category => {
      const topics = visible.filter(topic => topic.category === category);
      if (!topics.length) return '';
      const count = topics.filter(topic => state.selected.includes(topic.id)).length;
      return '<section class="dm-topic-group dm-topic-group--' + category.toLowerCase() + '"><header><div><b>' + escapeHtml(CATEGORY_NAMES[category]) + '</b><small>' + count + '／' + topics.length + ' 项已选</small></div><span>' + (category === 'G' ? '可持续发展相关治理' : CATEGORY_NAMES[category] + '议题') + '</span></header><div class="dm-topic-grid">' + topics.map(topic => renderTopicCard(topic, recommended.has(topic.id))).join('') + '</div></section>';
    }).join('');
    return '<section class="dm-library dm-panel"><div class="dm-panel-head dm-topic-head"><div><small>候选议题库</small><h2>按环境、社会、治理校准议题</h2></div><div class="dm-topic-tools"><div class="dm-view-switch" role="group" aria-label="议题布局"><button type="button" data-topic-view="cards" class="' + (state.topicView === 'cards' ? 'is-active' : '') + '">卡片</button><button type="button" data-topic-view="list" class="' + (state.topicView === 'list' ? 'is-active' : '') + '">列表</button></div><div class="dm-selection-count"><strong>' + selectedCount + '</strong><span>已选议题</span></div></div></div>'
      + renderCustomTopicForm()
      + '<div class="dm-library-note"><span>名称可直接修改</span><p>通用披露框架先完整载入本议题库已有映射，再用“行业重点／通用基础／标准覆盖”说明推荐原因；标准标签后的编号用于本工具稳定映射，不替代正式条款号。</p></div>'
      + '<div class="dm-topic-groups dm-topic-groups--' + state.topicView + '">' + groups + '</div>'
      + '<footer class="dm-step-actions"><div><small>方法来源</small><p>' + escapeHtml(library.methodology) + '</p></div><div class="dm-step-action-buttons"><button type="button" class="dm-secondary" data-action="back-setup">← 返回评估范围</button><button type="button" class="dm-primary" data-action="next-questionnaire"' + (selectedCount ? '' : ' disabled') + '>进入问卷收集 <span>→</span></button></div></footer>'
      + '</section>';
  }

  function renderQuestionnaireWorkflow() {
    const imported = state.surveyImport;
    const exportedBefore = Boolean(state.questionnaireExportedAt);
    const exported = exportedBefore && state.questionnaireSignature === questionnaireSignature();
    const stepClass = index => index === 1 || (index === 2 && exported) || (index >= 3 && imported) ? ' is-done' : (index === 2 && !exported) || (index === 3 && exported && !imported) ? ' is-current' : '';
    const status = imported
      ? '<div class="dm-questionnaire-result"><div><small>有效答卷</small><strong>' + imported.responseCount + '</strong></div><div><small>已匹配题列</small><strong>' + imported.mappedColumns + '</strong></div><div><small>形成双维得分</small><strong>' + Math.min(imported.impactTopicCount, imported.financialTopicCount) + '</strong></div></div><p>已导入：' + escapeHtml(imported.fileName) + ' · ' + escapeHtml(imported.importedAt) + '</p>'
      : exported
        ? '<div class="dm-questionnaire-state"><b>问卷包 V' + state.questionnaireVersion + ' 已导出</b><span>在问卷星完成发布与回收后，下载原始答卷并在这里导入。</span></div>'
        : exportedBefore
          ? '<div class="dm-questionnaire-state is-warning"><b>议题清单已变化</b><span>旧问卷与当前议题不再一致，请重新导出新版本后再导入答卷。</span></div>'
          : '<div class="dm-questionnaire-state"><b>尚未生成问卷</b><span>确认议题名称与范围后再导出，问卷发布后的议题变动会生成新版本。</span></div>';
    const nextLabel = imported ? '进入评分复核' : state.scoringStarted ? '继续内部评分' : '暂不使用问卷，开始内部评分';
    return '<section class="dm-questionnaire-workflow dm-panel"><div class="dm-panel-head"><div><small>问卷收集</small><h2>确定议题后，再收集评分证据</h2></div><p>问卷是形成建议分的一种证据来源。如果本次不开展问卷，也可以明确进入内部评分；系统不会在选择议题时自动生成分数。</p></div>'
      + '<div class="dm-questionnaire-steps"><div class="dm-questionnaire-step' + stepClass(1) + '"><b>1</b><span><strong>确认议题</strong><small>' + state.selected.length + ' 个议题已选</small></span></div><div class="dm-questionnaire-step' + stepClass(2) + '"><b>2</b><span><strong>导出问卷包</strong><small>生成问卷与映射文件</small></span></div><div class="dm-questionnaire-step' + stepClass(3) + '"><b>3</b><span><strong>问卷星发布与回收</strong><small>在问卷星完成外部收集</small></span></div><div class="dm-questionnaire-step' + stepClass(4) + '"><b>4</b><span><strong>导入原始答卷</strong><small>Excel／CSV 生成建议分</small></span></div></div>'
      + '<div class="dm-questionnaire-download"><div><small>完整问卷资料</small><strong>下载问卷包</strong><p>一个 ZIP 包含客户版 Word、问卷星创建文件和答卷回导模板。</p></div><button type="button" class="dm-primary" data-action="export-questionnaire"' + (state.selected.length ? '' : ' disabled') + '>' + (exported ? '重新下载问卷包' : '下载问卷包') + ' <span>↓</span></button></div>'
      + '<div class="dm-package-guide"><div class="dm-package-guide-title"><span>问卷包怎么用</span><small>按你的使用场景，只打开对应目录即可</small></div>'
      + '<div><b>发给客户确认</b><p>打开包内 <strong>01_客户沟通</strong> 的 Word，补充对象、时间和联系人后发送，也可另存为 PDF 或打印填写。</p></div>'
      + '<div><b>自己创建问卷星</b><p>打开 <strong>02_问卷星创建</strong>。人工录入看 TXT；交给智能体或官方工具使用 JSONL。</p></div>'
      + '<div><b>回收后生成结果</b><p>从问卷星下载原始 Excel／CSV，不改题目代码，再回到本页导入答卷。</p></div></div>'
      + '<div class="dm-questionnaire-bottom"><div class="dm-questionnaire-status">' + status + '</div><div class="dm-questionnaire-actions"><button type="button" class="dm-link-button" data-action="back-library">← 返回议题清单</button><button type="button" class="dm-secondary" data-action="select-survey-file"' + (exported ? '' : ' disabled') + '>导入答卷 Excel</button><input type="file" data-survey-file accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>' + (imported ? '<button type="button" class="dm-link-button" data-action="clear-survey-import">清除本次导入</button>' : '') + '<button type="button" class="dm-primary" data-action="' + (imported || state.scoringStarted ? 'go-scores' : 'start-internal-scoring') + '"' + (state.selected.length ? '' : ' disabled') + '>' + nextLabel + ' <span>→</span></button></div></div></section>';
  }

  function renderStepOne() {
    const content = state.step === 1 ? renderCompanySetup() : state.step === 2 ? renderTopicLibrary() : renderQuestionnaireWorkflow();
    return '<div class="dm-page dm-page--topics">' + content + '</div>';
  }

  function matrixPosition(score, axis) {
    return axis === 'x' ? 72 + ((score - 1) / 4) * 468 : 522 - ((score - 1) / 4) * 438;
  }

  function spreadPoints(points, minDistance = 24, bounds = { minX: 84, maxX: 528, minY: 96, maxY: 510 }) {
    const offsets = [{ x: 0, y: 0 }];
    for (let ring = 1; ring <= 4; ring += 1) {
      const count = ring * 8;
      const radius = ring * minDistance;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
        offsets.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
      }
    }
    const placed = [];
    return points.map(point => {
      let chosen = null;
      for (const offset of offsets) {
        const candidate = { x: point.baseX + offset.x, y: point.baseY + offset.y };
        const inside = candidate.x >= bounds.minX && candidate.x <= bounds.maxX && candidate.y >= bounds.minY && candidate.y <= bounds.maxY;
        const clear = placed.every(item => Math.hypot(item.x - candidate.x, item.y - candidate.y) >= minDistance);
        if (inside && clear) { chosen = candidate; break; }
      }
      if (!chosen) chosen = {
        x: Math.min(bounds.maxX, Math.max(bounds.minX, point.baseX)),
        y: Math.min(bounds.maxY, Math.max(bounds.minY, point.baseY))
      };
      const result = Object.assign({}, point, chosen);
      placed.push(result);
      return result;
    });
  }

  function matrixPointLayout(topics) {
    return spreadPoints(topics.filter(completeScores).map((topic, index) => {
      const scores = topicScores(topic);
      return {
        topic,
        index,
        scores,
        baseX: matrixPosition(scores.financial, 'x'),
        baseY: matrixPosition(scores.impact, 'y')
      };
    }));
  }

  function renderMatrix() {
    const topics = scoredTopics();
    if (!topics.length) return '<div class="dm-matrix-empty"><strong>尚未形成可绘制的双维分数</strong><p>导入问卷答卷，或返回第一步明确开始内部评分后，矩阵才会出现。</p></div>';
    const thresholdX = matrixPosition(state.threshold, 'x');
    const thresholdY = matrixPosition(state.threshold, 'y');
    const colors = matrixColors();
    const grid = [1, 2, 3, 4, 5].map(value => {
      const x = matrixPosition(value, 'x');
      const y = matrixPosition(value, 'y');
      return '<line x1="' + x + '" x2="' + x + '" y1="84" y2="522"/><line x1="72" x2="540" y1="' + y + '" y2="' + y + '"/><text x="' + x + '" y="548">' + value + '</text><text x="53" y="' + (y + 4) + '">' + value + '</text>';
    }).join('');
    const points = matrixPointLayout(topics).map(point => {
      const { topic, index, scores, x, y } = point;
      const label = displayName(topic);
      const number = index + 1;
      return '<g class="dm-point dm-point--' + topic.category.toLowerCase() + '" tabindex="0" role="button" data-matrix-topic="' + topic.id + '" aria-label="' + escapeHtml(label) + '，影响重要性' + scores.impact + '，财务重要性' + scores.financial + '"><circle cx="' + x + '" cy="' + y + '" r="9"></circle><text x="' + x + '" y="' + (y + 3) + '">' + number + '</text><title>' + escapeHtml(label) + '｜影响 ' + scores.impact + '｜财务 ' + scores.financial + '</title></g>';
    }).join('');
    return '<svg class="dm-matrix" viewBox="0 0 600 590" role="img" aria-labelledby="dm-matrix-title dm-matrix-desc">'
      + '<title id="dm-matrix-title">双重重要性矩阵</title><desc id="dm-matrix-desc">横轴是财务重要性，纵轴是影响重要性，虚线为当前阈值。</desc>'
      + '<rect class="dm-quadrant q-single" x="72" y="84" width="' + Math.max(0, thresholdX - 72) + '" height="' + Math.max(0, thresholdY - 84) + '" fill="' + colors.single + '"></rect>'
      + '<rect class="dm-quadrant q-double" x="' + thresholdX + '" y="84" width="' + Math.max(0, 540 - thresholdX) + '" height="' + Math.max(0, thresholdY - 84) + '" fill="' + colors.double + '"></rect>'
      + '<rect class="dm-quadrant q-none" x="72" y="' + thresholdY + '" width="' + Math.max(0, thresholdX - 72) + '" height="' + Math.max(0, 522 - thresholdY) + '" fill="' + colors.none + '"></rect>'
      + '<rect class="dm-quadrant q-single" x="' + thresholdX + '" y="' + thresholdY + '" width="' + Math.max(0, 540 - thresholdX) + '" height="' + Math.max(0, 522 - thresholdY) + '" fill="' + colors.single + '"></rect>'
      + '<g class="dm-grid">' + grid + '</g><line class="dm-threshold-line" x1="' + thresholdX + '" x2="' + thresholdX + '" y1="84" y2="522"></line><line class="dm-threshold-line" x1="72" x2="540" y1="' + thresholdY + '" y2="' + thresholdY + '"></line>'
      + '<line class="dm-axis" x1="72" x2="540" y1="522" y2="522"></line><line class="dm-axis" x1="72" x2="72" y1="84" y2="522"></line>'
      + '<text class="dm-axis-title" x="306" y="579">财务重要性 →</text><text class="dm-axis-title" x="-305" y="20" transform="rotate(-90)">影响重要性 →</text>'
      + '<g class="dm-points">' + points + '</g></svg>';
  }

  function renderMatrixLegend() {
    const colors = matrixColors();
    const regions = [['double', '双重重要'], ['single', '单一重要'], ['none', '不重要']];
    return '<div class="dm-matrix-legend"><div class="dm-region-colors"><b>区域颜色</b>' + regions.map(([key, label]) => '<label><input type="color" value="' + colors[key] + '" data-matrix-color="' + key + '" aria-label="修改' + label + '区域颜色"><i style="background:' + colors[key] + '"></i><span>' + label + '</span></label>').join('') + '</div><div class="dm-topic-colors"><b>议题类别</b><span><i class="e"></i>环境</span><span><i class="s"></i>社会</span><span><i class="g"></i>治理</span></div></div>';
  }

  function scoreSummary() {
    const counts = { double: 0, impact: 0, financial: 0, below: 0, unscored: 0 };
    selectedTopics().forEach(topic => counts[classification(topic).key] += 1);
    return counts;
  }

  function scoreTopicSurveyNote(topic) {
    const survey = state.surveyImport && state.surveyImport.topicStats ? state.surveyImport.topicStats[topic.id] : null;
    if (!survey) return '';
    return '<div class="dm-survey-score-note"><span>问卷 ' + Math.max(survey.impactCount || 0, survey.financialCount || 0) + ' 份</span>'
      + (survey.impactCount ? '<small>影响均值 ' + Number(survey.impactMean).toFixed(1) + '</small>' : '')
      + (survey.financialCount ? '<small>财务均值 ' + Number(survey.financialMean).toFixed(1) + '</small>' : '') + '</div>';
  }

  function activeScoreTopic() {
    const topics = selectedTopics();
    return topics.find(topic => topic.id === state.activeScoreTopicId) || topics.find(topic => !completeScores(topic)) || topics[0] || null;
  }

  function renderScoreTopicButton(topic, index) {
    const active = activeScoreTopic();
    const complete = completeScores(topic);
    return '<button type="button" class="dm-score-topic-button dm-score-topic-button--' + topic.category.toLowerCase() + (active && active.id === topic.id ? ' is-active' : '') + '" data-score-topic="' + topic.id + '">'
      + '<span>' + (index + 1) + '</span><div><small>' + CATEGORY_NAMES[topic.category] + '</small><strong>' + escapeHtml(displayName(topic)) + '</strong></div>'
      + '<b class="' + (complete ? 'is-complete' : '') + '" data-score-status="' + topic.id + '">' + (complete ? '已评分' : '待评分') + '</b></button>';
  }

  function renderScoreEditor(topic) {
    const scores = topicScores(topic) || { impact: null, financial: null };
    const note = state.notes[topic.id] || '';
    const impactReady = validScore(scores.impact);
    const financialReady = validScore(scores.financial);
    const topics = selectedTopics();
    const position = Math.max(0, topics.findIndex(item => item.id === topic.id));
    return '<article class="dm-score-editor dm-score-editor--' + topic.category.toLowerCase() + '"><header><div><small>' + CATEGORY_NAMES[topic.category] + ' · 第 ' + (position + 1) + '／' + topics.length + ' 项</small><h3>' + escapeHtml(displayName(topic)) + '</h3></div><span>' + (completeScores(topic) ? '双维度已完成' : '请完成两个维度') + '</span></header>'
      + '<p class="dm-score-description">' + escapeHtml(topic.description) + '</p>' + scoreTopicSurveyNote(topic)
      + '<div class="dm-score-editor-controls"><label class="dm-score-control' + (impactReady ? '' : ' is-unset') + '"><span>影响重要性 <output data-score-output="' + topic.id + ':impact">' + (impactReady ? Number(scores.impact).toFixed(1) : '未评分') + '</output></span><input type="range" min="1" max="5" step="0.1" value="' + (impactReady ? scores.impact : 3) + '" data-score="' + topic.id + ':impact"><small>对经济、环境和人产生的实际或潜在影响</small></label>'
      + '<label class="dm-score-control' + (financialReady ? '' : ' is-unset') + '"><span>财务重要性 <output data-score-output="' + topic.id + ':financial">' + (financialReady ? Number(scores.financial).toFixed(1) : '未评分') + '</output></span><input type="range" min="1" max="5" step="0.1" value="' + (financialReady ? scores.financial : 3) + '" data-score="' + topic.id + ':financial"><small>对企业财务状况、经营成果和现金流的影响</small></label></div>'
      + '<label class="dm-score-note"><span>评分依据与备注</span><textarea data-note="' + topic.id + '" rows="4" placeholder="记录利益相关方反馈、风险事件、数据证据或管理层判断…">' + escapeHtml(note) + '</textarea></label>'
      + '<footer><button type="button" class="dm-secondary" data-action="previous-score"' + (position ? '' : ' disabled') + '>← 上一议题</button><button type="button" class="dm-primary" data-action="next-score"' + (position < topics.length - 1 ? '' : ' disabled') + '>下一议题 →</button></footer></article>';
  }

  function renderScoringWorkspace() {
    const topics = selectedTopics().filter(topic => state.categoryFilter === 'all' || topic.category === state.categoryFilter);
    const active = activeScoreTopic();
    const completed = scoredTopics().length;
    const sourceText = state.surveyImport ? '问卷均值已载入，请逐项复核。全部议题完成双维度评分后，才显示矩阵与结果概览。' : '点击左侧议题，在右侧分别完成影响重要性和财务重要性评分。全部完成后显示矩阵。';
    return '<section class="dm-scoring-workspace dm-panel"><div class="dm-panel-head"><div><small>逐项评分</small><h2>先完成评分，再查看矩阵</h2></div><p>' + sourceText + '</p></div>'
      + '<div class="dm-scoring-progress"><span><b data-scored-count>' + completed + '</b>／' + state.selected.length + ' 个议题已完成</span><i><b style="width:' + Math.round((completed / Math.max(1, state.selected.length)) * 100) + '%" data-score-progress></b></i></div>'
      + '<div class="dm-filter-tabs" role="group" aria-label="按类别筛选">' + [['all','全部'],['E','环境'],['S','社会'],['G','治理']].map(item => '<button type="button" data-category="' + item[0] + '" class="' + (state.categoryFilter === item[0] ? 'is-active' : '') + '">' + item[1] + '</button>').join('') + '</div>'
      + '<div class="dm-scoring-grid"><div class="dm-score-topic-list">' + topics.map((topic, index) => renderScoreTopicButton(topic, state.selected.indexOf(topic.id))).join('') + '</div>' + (active ? renderScoreEditor(active) : '<div class="dm-score-editor-empty">请选择一个议题开始评分</div>') + '</div></section>';
  }

  function renderSurveyEvidence() {
    const imported = state.surveyImport;
    if (imported) return '<section class="dm-evidence-summary dm-panel"><div><small>评分来源</small><h2>问卷建议分已导入</h2><p>' + escapeHtml(imported.fileName) + ' · ' + escapeHtml(imported.importedAt) + (imported.warning ? ' · ' + escapeHtml(imported.warning) : '') + '</p></div><div class="dm-survey-result"><div><small>有效答卷</small><strong>' + imported.responseCount + '</strong></div><div><small>已匹配题列</small><strong>' + imported.mappedColumns + '</strong></div><div><small>双维完整议题</small><strong>' + Math.min(imported.impactTopicCount, imported.financialTopicCount) + '</strong></div></div><button type="button" data-action="back-topics">更换问卷或答卷</button></section>';
    return '<section class="dm-evidence-summary dm-panel"><div><small>评分来源</small><h2>内部评分模式</h2><p>本次未导入问卷答卷。请逐项选择议题并完成两个维度的评分，不预填默认结论。</p></div><button type="button" data-action="back-topics">返回导出或导入问卷</button></section>';
  }

  function renderResults() {
    const summary = scoreSummary();
    const completed = scoredTopics().length;
    return '<section class="dm-results dm-panel"><div class="dm-result-toolbar"><div><small>结果视图</small><h2>' + escapeHtml(state.companyName || '本次评估') + '</h2><p>' + completed + '／' + state.selected.length + ' 个议题已形成双维分数</p></div><div class="dm-toolbar-actions"><button type="button" data-action="export-matrix"' + (completed ? '' : ' disabled') + '>导出矩阵图片</button><button type="button" data-action="export-list"' + (completed ? '' : ' disabled') + '>导出议题清单</button><button type="button" data-action="print">打印</button></div></div>'
      + '<div class="dm-result-layout"><div class="dm-matrix-column"><div class="dm-matrix-wrap" data-matrix-wrap>' + renderMatrix() + '</div>' + renderMatrixLegend() + '</div>'
      + '<aside class="dm-result-side"><div class="dm-side-title"><small>结果概览</small><strong>' + completed + ' 个已评分</strong></div><div class="dm-summary" aria-live="polite"><div><strong data-summary="double">' + summary.double + '</strong><span>双重重要</span></div><div><strong data-summary="impact">' + summary.impact + '</strong><span>仅影响重要</span></div><div><strong data-summary="financial">' + summary.financial + '</strong><span>仅财务重要</span></div><div><strong data-summary="below">' + summary.below + '</strong><span>低于阈值</span></div>' + (summary.unscored ? '<div class="dm-summary-unscored"><strong data-summary="unscored">' + summary.unscored + '</strong><span>待补充评分</span></div>' : '') + '</div><div class="dm-threshold"><label><span>重要性阈值</span><input type="range" min="1.5" max="4.5" step="0.1" value="' + state.threshold + '" data-threshold><output data-threshold-output>' + Number(state.threshold).toFixed(1) + '</output></label><p>两个维度分别与阈值比较。阈值应由企业批准，并保留判断依据。</p></div><div class="dm-result-rule"><b>判定方式</b><span>双维均达阈值：双重重要</span><span>单维达阈值：影响或财务重要</span></div></aside></div>'
      + '</section>';
  }

  function renderStepTwo() {
    if (!canOpenScores()) return '<div class="dm-page dm-page--scores"><section class="dm-score-gate dm-panel"><strong>尚未选择评分来源</strong><p>请先在第三步导入问卷答卷，或者明确开始内部评分。</p><button type="button" class="dm-primary" data-action="back-topics">返回问卷收集</button></section></div>';
    return '<div class="dm-page dm-page--scores"><div class="dm-score-intro"><button type="button" data-action="back-topics">← 返回问卷收集</button><p><strong>' + state.selected.length + ' 个议题进入评分</strong><span>全部完成双维度评分后显示矩阵。</span></p></div>' + renderSurveyEvidence() + renderScoringWorkspace() + (allScoresComplete() ? renderResults() : '')
      + '<section class="dm-method-note"><strong>评分边界</strong><p>影响重要性从影响规模、范围、不可补救性与发生可能性判断；财务重要性从风险或机遇的金额、发生可能性和时间范围判断。问卷均值或内部起始值都不是最终结论，调整应保留依据并经过企业审议。</p></section></div>';
  }

  function render() {
    const root = document.getElementById('materiality-app');
    if (!root) return;
    root.innerHTML = '<div class="dm-shell">' + renderHeader() + (state.step < 4 ? renderStepOne() : renderStepTwo()) + '<footer class="dm-footer"><span>议题库版本 ' + escapeHtml(library.version) + '</span><p>' + escapeHtml(library.notice) + '</p></footer><div class="dm-toast" data-toast role="status" aria-live="polite"></div></div>';
    const heroFlow = root.querySelector('.dm-hero-flow');
    const activeStep = heroFlow && heroFlow.querySelector('.is-active');
    if (heroFlow && activeStep) heroFlow.scrollLeft = Math.max(0, activeStep.offsetLeft - (heroFlow.clientWidth - activeStep.clientWidth) / 2);
  }

  function updateResultsOnly() {
    const wrap = document.querySelector('[data-matrix-wrap]');
    if (wrap) wrap.innerHTML = renderMatrix();
    const summary = scoreSummary();
    const completed = scoredTopics().length;
    const scoredCount = document.querySelector('[data-scored-count]');
    const progress = document.querySelector('[data-score-progress]');
    if (scoredCount) scoredCount.textContent = completed;
    if (progress) progress.style.width = Math.round((completed / Math.max(1, state.selected.length)) * 100) + '%';
    Object.entries(summary).forEach(([key, value]) => {
      const node = document.querySelector('[data-summary="' + key + '"]');
      if (node) node.textContent = value;
    });
    selectedTopics().forEach(topic => {
      const result = classification(topic);
      const status = document.querySelector('[data-score-status="' + topic.id + '"]');
      if (status) {
        status.className = completeScores(topic) ? 'is-complete' : '';
        status.textContent = completeScores(topic) ? '已评分' : '待评分';
      }
      const badge = document.querySelector('[data-result="' + topic.id + '"]');
      if (badge) {
        badge.className = 'dm-result dm-result--' + result.key;
        badge.textContent = result.label;
      }
    });
  }

  function safeFilename(value) {
    return String(value || '双重重要性评估').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    return '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"';
  }

  function showToast(message, type) {
    const toast = document.querySelector('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.className = 'dm-toast is-visible' + (type === 'error' ? ' is-error' : '');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.className = 'dm-toast'; }, 4200);
  }

  function shortHash(value) {
    let hash = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).toUpperCase();
  }

  function assessmentCode() {
    return String(state.assessmentId || '').replace(/[^a-z0-9]/gi, '').slice(-8).toUpperCase() || shortHash(state.companyName).slice(0, 8);
  }

  function questionnaireSignature() {
    return shortHash(JSON.stringify({
      company: state.companyName,
      industry: state.industry,
      standards: state.standards,
      topics: selectedTopics().map(topic => [topic.id, displayName(topic), topic.description])
    }));
  }

  function buildQuestionnaireMap() {
    const entries = [];
    selectedTopics().forEach((topic, index) => {
      const number = String(index + 1).padStart(2, '0');
      entries.push({ code: 'I' + number, dimension: 'impact', topicId: topic.id, name: displayName(topic) });
      entries.push({ code: 'F' + number, dimension: 'financial', topicId: topic.id, name: displayName(topic) });
    });
    return entries;
  }

  function prepareQuestionnaireVersion() {
    const signature = questionnaireSignature();
    if (state.questionnaireSignature && state.questionnaireSignature !== signature) {
      state.questionnaireVersion = Math.max(1, Number(state.questionnaireVersion) || 1) + 1;
      if (state.surveyImport) {
        state.scores = {};
        state.scoreOrigins = {};
        state.scoringStarted = false;
      }
      state.surveyImport = null;
    }
    state.questionnaireSignature = signature;
    state.questionnaireMap = buildQuestionnaireMap();
    state.questionnaireExportedAt = new Date().toISOString();
    saveState();
  }

  function questionnaireMarker() {
    return '【DM-' + assessmentCode() + '-V' + state.questionnaireVersion + '】';
  }

  function wordXml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
    })[char]);
  }

  function wordRun(text, options = {}) {
    const properties = [
      options.bold ? '<w:b/>' : '',
      options.color ? '<w:color w:val="' + options.color + '"/>' : '',
      options.size ? '<w:sz w:val="' + options.size + '"/><w:szCs w:val="' + options.size + '"/>' : '',
      options.font ? '<w:rFonts w:ascii="' + options.font + '" w:hAnsi="' + options.font + '" w:eastAsia="' + options.font + '"/>' : ''
    ].join('');
    const parts = String(text == null ? '' : text).split(/\r?\n/);
    const content = parts.map((part, index) => (index ? '<w:br/>' : '') + '<w:t xml:space="preserve">' + wordXml(part) + '</w:t>').join('');
    return '<w:r>' + (properties ? '<w:rPr>' + properties + '</w:rPr>' : '') + content + '</w:r>';
  }

  function wordParagraph(text, style, options = {}) {
    const properties = [style ? '<w:pStyle w:val="' + style + '"/>' : '', options.keepNext ? '<w:keepNext/>' : '', options.pageBreakBefore ? '<w:pageBreakBefore/>' : '', options.align ? '<w:jc w:val="' + options.align + '"/>' : '', options.after != null ? '<w:spacing w:after="' + options.after + '"/>' : ''].join('');
    return '<w:p>' + (properties ? '<w:pPr>' + properties + '</w:pPr>' : '') + wordRun(text, options) + '</w:p>';
  }

  function wordCell(content, width, options = {}) {
    const fill = options.fill ? '<w:shd w:val="clear" w:color="auto" w:fill="' + options.fill + '"/>' : '';
    const gridSpan = options.gridSpan ? '<w:gridSpan w:val="' + options.gridSpan + '"/>' : '';
    const vertical = '<w:vAlign w:val="center"/>';
    const margin = '<w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>';
    const paragraph = wordParagraph(content, options.style || 'TableText', { bold: options.bold, color: options.color, align: options.align });
    return '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/>' + gridSpan + fill + vertical + margin + '</w:tcPr>' + paragraph + '</w:tc>';
  }

  function wordRow(cells, options = {}) {
    return '<w:tr><w:trPr><w:cantSplit/>' + (options.header ? '<w:tblHeader/>' : '') + '</w:trPr>' + cells.join('') + '</w:tr>';
  }

  function wordTable(rows, widths) {
    return '<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="C9D6CF"/><w:left w:val="single" w:sz="4" w:color="C9D6CF"/><w:bottom w:val="single" w:sz="4" w:color="C9D6CF"/><w:right w:val="single" w:sz="4" w:color="C9D6CF"/><w:insideH w:val="single" w:sz="4" w:color="DCE5E0"/><w:insideV w:val="single" w:sz="4" w:color="DCE5E0"/></w:tblBorders></w:tblPr><w:tblGrid>' + widths.map(width => '<w:gridCol w:w="' + width + '"/>').join('') + '</w:tblGrid>' + rows.join('') + '</w:tbl>';
  }

  function questionnaireDocumentXml(manifest) {
    const standards = manifest.standards.map(item => item.name).join('、') || '未指定';
    const company = manifest.companyName || '';
    const documentTitle = (company ? company : '') + '可持续发展报告重要性议题调研方案与问卷';
    const infoRows = [
      wordRow([wordCell('企业名称', 1500, { bold: true, fill: 'E7F1EB' }), wordCell(company || '待填写', 3000), wordCell('所属行业', 1500, { bold: true, fill: 'E7F1EB' }), wordCell(manifest.industry || '待填写', 3000)]),
      wordRow([wordCell('参考标准', 1500, { bold: true, fill: 'E7F1EB' }), wordCell(standards, 7500, { gridSpan: 3 })]),
      wordRow([wordCell('调研方式', 1500, { bold: true, fill: 'E7F1EB' }), wordCell('建议采用在线问卷，必要时辅以访谈', 3000), wordCell('计划时间', 1500, { bold: true, fill: 'E7F1EB' }), wordCell('____年__月__日至____年__月__日', 3000)]),
      wordRow([wordCell('联系人', 1500, { bold: true, fill: 'E7F1EB' }), wordCell('____________________', 3000), wordCell('联系方式', 1500, { bold: true, fill: 'E7F1EB' }), wordCell('____________________', 3000)])
    ];
    const audienceRows = [
      wordRow([wordCell('内部参与者', 1800, { bold: true, fill: 'E7F1EB' }), wordCell('董事会或管理层、业务与职能部门、员工代表', 7200)]),
      wordRow([wordCell('外部参与者', 1800, { bold: true, fill: 'E7F1EB' }), wordCell('股东与投资者、客户或消费者、供应商与合作伙伴、债权人与金融机构、社区及其他受影响群体', 7200)]),
      wordRow([wordCell('样本安排', 1800, { bold: true, fill: 'E7F1EB' }), wordCell('根据企业规模、业务分布与利益相关方结构确定；建议兼顾不同职能、地区和业务关系', 7200)])
    ];
    const respondentRows = (financialOnly) => [
      wordRow([wordCell('您的类型', 1800, { bold: true, fill: 'E7F1EB' }), wordCell(financialOnly
        ? '□董事会或管理层  □战略、财务、风控或业务部门  □股东或投资者  □债权人或金融机构  □其他'
        : '□董事会或管理层  □业务或职能部门  □员工  □客户或消费者\n□供应商或合作伙伴  □股东、投资者或金融机构  □社区或其他受影响群体  □其他', 7200)]),
      wordRow([wordCell('熟悉程度', 1800, { bold: true, fill: 'E7F1EB' }), wordCell('□非常熟悉  □比较熟悉  □一般  □不太熟悉  □不了解', 7200)])
    ];
    const assessmentTable = () => {
      const widths = [650, 1950, 4100, 2300];
      const rows = [wordRow([
        wordCell('序号', widths[0], { bold: true, fill: '176B4A', color: 'FFFFFF', align: 'center' }),
        wordCell('议题', widths[1], { bold: true, fill: '176B4A', color: 'FFFFFF', align: 'center' }),
        wordCell('议题说明', widths[2], { bold: true, fill: '176B4A', color: 'FFFFFF', align: 'center' }),
        wordCell('请选择一个评分', widths[3], { bold: true, fill: '176B4A', color: 'FFFFFF', align: 'center' })
      ], { header: true })];
      manifest.topics.forEach((topic, index) => rows.push(wordRow([
        wordCell(String(index + 1), widths[0], { bold: true, align: 'center' }),
        wordCell(topic.name, widths[1], { bold: true }),
        wordCell(topic.description || '请结合企业实际进一步明确议题范围。', widths[2]),
        wordCell('□ 1  □ 2  □ 3\n□ 4  □ 5  □ 无法判断', widths[3])
      ])));
      return wordParagraph('评分：1 很低｜2 较低｜3 一般｜4 较高｜5 很高｜无法判断', 'Instruction', { keepNext: true })
        + wordTable(rows, widths);
    };
    const body = [
      wordParagraph(documentTitle, 'Title', { align: 'center' }),
      wordParagraph('用于双重重要性议题识别与判断', 'Subtitle', { align: 'center' }),
      wordParagraph('本方案用于组织企业内外部利益相关方调研，分别收集对企业外部影响和对企业财务影响的判断。问卷结果作为重要性分析的证据来源，最终结论由企业结合事实依据、专家意见和管理层审议确认。', 'Intro'),
      wordParagraph('一、调研实施建议', 'Heading1', { keepNext: true }),
      wordTable(infoRows, [1500, 3000, 1500, 3000]),
      wordParagraph('建议覆盖的参与者', 'Heading2', { keepNext: true }),
      wordTable(audienceRows, [1800, 7200]),
      wordParagraph('建议先确认议题清单与问卷对象，再发布问卷。回收后检查样本构成、缺失值与异常评分，并将调研结果与业务事实及管理层判断交叉验证。', 'BodyText'),
      wordParagraph('二、影响重要性调研问卷', 'Heading1', { keepNext: true, pageBreakBefore: true }),
      wordParagraph('您好！诚邀您结合对企业及其业务关系的了解，判断企业的活动、产品、服务和业务关系在各议题上对经济、环境和人产生或可能产生的重大正面或负面影响。评价时可结合影响的规模、范围、不可补救性及发生可能性。', 'BodyText'),
      wordParagraph('填写说明', 'Heading2', { keepNext: true }),
      wordParagraph('本问卷预计用时2—3分钟。问卷可匿名填写，无需提供敏感个人信息；答案无对错，调研结果将按汇总方式使用。本问卷评价的是影响的重要程度，不是对企业表现打分。请避免对所有议题统一给出高分或低分；不具备判断条件时，请选择“无法判断”。', 'BodyText'),
      wordTable(respondentRows(false), [1800, 7200]),
      assessmentTable(),
      wordParagraph('补充意见：请说明判断依据、案例或建议，以及您认为遗漏的重要议题。', 'Heading2'),
      wordParagraph('________________________________________________________________________________', 'BodyText'),
      wordParagraph('________________________________________________________________________________', 'BodyText'),
      wordParagraph('三、财务重要性调研问卷', 'Heading1', { keepNext: true, pageBreakBefore: true }),
      wordParagraph('您好！诚邀您判断各可持续发展议题形成的风险或机遇，在短期、中期或长期内对企业业务模式、运营、战略、财务状况、经营成果、现金流、融资及资金成本产生影响的程度。', 'BodyText'),
      wordParagraph('填写说明', 'Heading2', { keepNext: true }),
      wordParagraph('本问卷预计用时2—3分钟，建议由熟悉企业战略、财务、运营或风险管理的人员填写。问卷可匿名填写，结果按汇总方式使用。请结合议题对企业造成资源获取变化、成本上升、收入机会、资产价值变化或融资条件变化的可能性综合判断。', 'BodyText'),
      wordTable(respondentRows(true), [1800, 7200]),
      assessmentTable(),
      wordParagraph('补充意见：请说明判断依据、可能受影响的业务环节或财务项目，以及您认为遗漏的重要议题。', 'Heading2'),
      wordParagraph('________________________________________________________________________________', 'BodyText'),
      wordParagraph('________________________________________________________________________________', 'BodyText'),
      wordParagraph('感谢您的参与。', 'Instruction', { align: 'center' })
    ].join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' + body + '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567"/><w:cols w:space="425"/><w:docGrid w:linePitch="312"/></w:sectPr></w:body></w:document>';
  }

  async function buildQuestionnaireDocx(manifest) {
    if (!window.JSZip) throw new Error('Word 生成组件未加载');
    const docx = new window.JSZip();
    docx.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>');
    docx.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>');
    docx.file('word/document.xml', questionnaireDocumentXml(manifest));
    docx.file('word/_rels/document.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
    docx.file('word/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="Hiragino Sans GB"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:color w:val="24342C"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="0" w:after="160"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:color w:val="111111"/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="280"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="557367"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="260" w:after="100"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="111111"/><w:sz w:val="27"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="70"/></w:pPr><w:rPr><w:b/><w:color w:val="111111"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Intro"><w:name w:val="Intro"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="180" w:line="330" w:lineRule="auto"/></w:pPr><w:rPr><w:color w:val="40534A"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="110"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Instruction"><w:name w:val="Instruction"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="100"/><w:keepNext/></w:pPr><w:rPr><w:b/><w:color w:val="176B4A"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="TableText"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="260" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="220" w:after="0"/></w:pPr><w:rPr><w:color w:val="6F7F77"/><w:sz w:val="17"/></w:rPr></w:style></w:styles>');
    docx.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + wordXml((manifest.companyName || '') + '可持续发展报告重要性议题调研方案与问卷') + '</dc:title><dc:creator>AI×ESG 工作台</dc:creator><cp:lastModifiedBy>AI×ESG 工作台</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">' + wordXml(manifest.createdAt) + '</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">' + wordXml(manifest.createdAt) + '</dcterms:modified></cp:coreProperties>');
    docx.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>AI×ESG 工作台</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company>' + wordXml(manifest.companyName || '') + '</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>1.0</AppVersion></Properties>');
    return docx.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  }

  function questionnairePackageFiles() {
    prepareQuestionnaireVersion();
    const topics = selectedTopics();
    const marker = questionnaireMarker();
    const company = state.companyName || '本企业';
    const title = company + '双重重要性利益相关方问卷';
    const optionalTitles = ['【OPEN-EVIDENCE】请补充您作出判断的依据、案例或建议', '【OPEN-MISSING】您认为还遗漏了哪些重要议题'];
    const impactRows = state.questionnaireMap.filter(item => item.dimension === 'impact').map(item => '【' + item.code + '】' + item.name);
    const financialRows = state.questionnaireMap.filter(item => item.dimension === 'financial').map(item => '【' + item.code + '】' + item.name);
    const choices = ['NA 无法判断', '1 很低', '2 较低', '3 一般', '4 较高', '5 很高'];
    const jsonlObjects = [
      { qtype: '问卷基础信息', title, introduction: marker + ' 本问卷用于收集双重重要性评估证据。请根据了解程度作答；不具备判断条件时选择“无法判断”。', atype: 1 },
      { qtype: '单选', title: '【ROLE】您属于哪类利益相关方', select: ['董事会或管理层', '业务或职能部门', '员工', '客户或消费者', '供应商或合作伙伴', '投资者或金融机构', '社区或其他受影响群体', '其他'] },
      { qtype: '单选', title: '【FAMILIARITY】您对本企业经营及可持续发展情况的熟悉程度', select: ['非常熟悉', '比较熟悉', '一般', '不太熟悉', '不了解'] },
      { qtype: '矩阵单选', title: marker + '影响重要性评价：企业对经济、环境和人的影响程度', rowtitle: impactRows, select: choices },
      { qtype: '矩阵单选', title: marker + '财务重要性评价：议题对企业发展、财务状况和经营成果的影响程度', rowtitle: financialRows, select: choices },
      { qtype: '简答题', title: optionalTitles[0], requir: false },
      { qtype: '简答题', title: optionalTitles[1], requir: false }
    ];
    const jsonl = jsonlObjects.map(item => JSON.stringify(item)).join('\n') + '\n';
    const textLines = [title, marker + ' 本问卷用于收集双重重要性评估证据。不了解或不具备判断条件时请选择“无法判断”。', '===',
      '1. 【ROLE】您属于哪类利益相关方 [单选题]', '董事会或管理层', '业务或职能部门', '员工', '客户或消费者', '供应商或合作伙伴', '投资者或金融机构', '社区或其他受影响群体', '其他',
      '2. 【FAMILIARITY】您对本企业经营及可持续发展情况的熟悉程度 [单选题]', '非常熟悉', '比较熟悉', '一般', '不太熟悉', '不了解',
      '3. ' + marker + '影响重要性评价 [矩阵单选题]', '行：', ...impactRows.map(item => '- ' + item), '列：', ...choices.map(item => '- ' + item),
      '4. ' + marker + '财务重要性评价 [矩阵单选题]', '行：', ...financialRows.map(item => '- ' + item), '列：', ...choices.map(item => '- ' + item),
      '5. ' + optionalTitles[0] + ' [简答题]', '6. ' + optionalTitles[1] + ' [简答题]'];
    const industry = library.industries.find(item => item.id === state.industry)?.name || state.industry;
    const manifest = {
      schemaVersion: '1.0', assessmentId: state.assessmentId, assessmentCode: assessmentCode(), questionnaireVersion: state.questionnaireVersion,
      questionnaireMarker: marker, createdAt: state.questionnaireExportedAt, companyName: state.companyName || '', industry,
      standards: state.standards.map(id => ({ id, name: standardById(id)?.name || id })), topicLibraryVersion: library.version,
      topics: topics.map((topic, index) => ({ order: index + 1, topicId: topic.id, category: topic.category, name: displayName(topic), description: topic.description, impactCode: 'I' + String(index + 1).padStart(2, '0'), financialCode: 'F' + String(index + 1).padStart(2, '0'), source: topic.source || '企业自定义' }))
    };
    const mapRows = [['问卷版本', '维度', '题目代码', '议题ID', '议题类别', '议题名称', '议题说明', '参考来源']];
    manifest.topics.forEach(topic => {
      mapRows.push([state.questionnaireVersion, '影响重要性', topic.impactCode, topic.topicId, CATEGORY_NAMES[topic.category], topic.name, topic.description, topic.source]);
      mapRows.push([state.questionnaireVersion, '财务重要性', topic.financialCode, topic.topicId, CATEGORY_NAMES[topic.category], topic.name, topic.description, topic.source]);
    });
    const importHeaders = ['序号', '提交时间', marker + '【ROLE】利益相关方类型', ...manifest.topics.map(topic => marker + '【' + topic.impactCode + '】' + topic.name), ...manifest.topics.map(topic => marker + '【' + topic.financialCode + '】' + topic.name)];
    const scoring = {
      schemaVersion: '1.0', scale: { min: 1, max: 5, ignoredValues: ['NA 无法判断', '无法判断', '不了解', '不适用', ''] },
      aggregation: { method: 'arithmetic_mean', rounding: 1, show: ['count', 'mean', 'median', 'standardDeviation'] },
      dimensions: { impact: '影响重要性', financial: '财务重要性' },
      decisionBoundary: '问卷均值作为建议分，最终分数、权重和阈值由企业审议确认。'
    };
    const optionalJson = JSON.stringify(optionalTitles);
    const readme = '# ' + title + '｜问卷包使用说明\n\n'
      + '> 第一次使用：先打开 `01_客户沟通/双重重要性问卷方案.docx`。它是可直接发客户、也可作为自己录入问卷星底稿的正式版本。\n\n'
      + '- 评估编号：`' + state.assessmentId + '`\n- 问卷版本：`V' + state.questionnaireVersion + '`\n- 识别标记：`' + marker + '`\n- 议题数量：' + topics.length + '\n\n'
      + '## 场景一：发给客户确认或填写\n\n打开 `01_客户沟通/双重重要性问卷方案.docx`，补充评估对象、回收截止日和联系人。可直接发送 Word、另存为 PDF，或打印后线下填写。客户确认内容后，再决定是否转为在线问卷。\n\n'
      + '## 场景二：自己在问卷星创建\n\n- 人工创建：参照 `02_问卷星创建/questionnaire-import.txt` 录入。\n- 交给智能体或官方工具：使用 `02_问卷星创建/questionnaire.jsonl`。先执行预检：\n\n```bash\nwjx survey create --file "02_问卷星创建/questionnaire.jsonl" --optional_titles ' + "'" + optionalJson + "'" + ' --dry-run\n```\n\n预检后人工核对标题、题目数量、矩阵行、量表和选填题，再确认实际创建或发布。\n\n'
      + '## 场景三：回收答卷并生成矩阵\n\n1. 在问卷星下载原始答卷 `.xlsx` 或 CSV。\n2. 不修改题目中的 `【I01】`、`【F01】` 等代码及问卷版本标记。\n3. 回到双重重要性页面，在第一步点击“导入答卷 Excel”。\n4. 页面汇总建议分后，再进入第二步复核分数、阈值和矩阵。\n\n'
      + '## 目录说明\n\n- `01_客户沟通/`：可阅读、可编辑的 Word 问卷方案。\n- `02_问卷星创建/`：人工录入文本和自动创建 JSONL。\n- `03_结果回导/`：题目映射、评分口径、评估清单和导入字段模板。\n\n'
      + '题序可以调整，但识别代码和版本标记用于防止答卷错配，请保留。\n';
    const quickStart = '双重重要性问卷包｜快速开始\r\n\r\n'
      + '发给客户：打开 01_客户沟通/双重重要性问卷方案.docx\r\n'
      + '自己建问卷星：打开 02_问卷星创建/questionnaire-import.txt\r\n'
      + '交给智能体创建：使用 02_问卷星创建/questionnaire.jsonl\r\n'
      + '答卷回导：下载问卷星原始 Excel 或 CSV，在网页第一步导入\r\n\r\n'
      + '完整说明见 README.md。\r\n';
    return {
      'README.md': readme,
      '快速开始.txt': '\ufeff' + quickStart,
      '02_问卷星创建/questionnaire.jsonl': jsonl,
      '02_问卷星创建/questionnaire-import.txt': '\ufeff' + textLines.join('\r\n') + '\r\n',
      '03_结果回导/topic-question-map.csv': '\ufeff' + mapRows.map(row => row.map(csvCell).join(',')).join('\r\n'),
      '03_结果回导/scoring-config.json': JSON.stringify(scoring, null, 2) + '\n',
      '03_结果回导/assessment-manifest.json': JSON.stringify(manifest, null, 2) + '\n',
      '03_结果回导/response-import-template.csv': '\ufeff' + importHeaders.map(csvCell).join(',') + '\r\n'
    };
  }

  async function exportQuestionnairePackage() {
    if (!window.JSZip) throw new Error('问卷打包组件未加载，请刷新页面后重试');
    const files = questionnairePackageFiles();
    const manifest = JSON.parse(files['03_结果回导/assessment-manifest.json']);
    const word = await buildQuestionnaireDocx(manifest);
    const zip = new window.JSZip();
    Object.entries(files).forEach(([name, content]) => zip.file(name, content));
    zip.file('01_客户沟通/双重重要性问卷方案.docx', word);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    downloadBlob(blob, safeFilename(state.companyName) + '_双重重要性问卷包_V' + state.questionnaireVersion + '.zip');
    render();
    showToast('问卷包 V' + state.questionnaireVersion + ' 已导出');
  }

  function parseCsvText(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const input = String(text || '').replace(/^\ufeff/, '');
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      if (quoted) {
        if (char === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(cell); cell = ''; }
      else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += char;
    }
    if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
    return rows;
  }

  function xmlDocument(text, type) {
    const doc = new DOMParser().parseFromString(text, type || 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Excel 文件中的 XML 无法解析');
    return doc;
  }

  function localElements(node, name) {
    return [...node.getElementsByTagNameNS('*', name)];
  }

  function nodeText(node) {
    return localElements(node, 't').map(item => item.textContent || '').join('') || node.textContent || '';
  }

  function resolveZipPath(basePath, target) {
    if (String(target).startsWith('/')) return String(target).replace(/^\/+/, '');
    const parts = String(basePath).split('/');
    parts.pop();
    String(target).split('/').forEach(part => {
      if (!part || part === '.') return;
      if (part === '..') parts.pop(); else parts.push(part);
    });
    return parts.join('/');
  }

  function excelColumnIndex(reference) {
    const letters = String(reference || '').match(/^[A-Z]+/i)?.[0] || 'A';
    return [...letters.toUpperCase()].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
  }

  async function parseXlsxBuffer(buffer, zipConstructor) {
    const JSZipClass = zipConstructor || window.JSZip;
    if (!JSZipClass) throw new Error('Excel 读取组件未加载');
    const zip = await JSZipClass.loadAsync(buffer);
    const workbookFile = zip.file('xl/workbook.xml');
    const relsFile = zip.file('xl/_rels/workbook.xml.rels');
    if (!workbookFile || !relsFile) throw new Error('不是可识别的 .xlsx 工作簿');
    const [workbookText, relsText] = await Promise.all([workbookFile.async('string'), relsFile.async('string')]);
    const workbook = xmlDocument(workbookText);
    const rels = xmlDocument(relsText);
    const relationships = new Map(localElements(rels, 'Relationship').map(item => [item.getAttribute('Id'), item.getAttribute('Target')]));
    const firstSheet = localElements(workbook, 'sheet')[0];
    if (!firstSheet) throw new Error('工作簿中没有工作表');
    const relationId = firstSheet.getAttribute('r:id') || [...firstSheet.attributes].find(item => item.localName === 'id')?.value;
    const target = relationships.get(relationId);
    if (!target) throw new Error('无法定位答卷工作表');
    const sheetFile = zip.file(resolveZipPath('xl/workbook.xml', target));
    if (!sheetFile) throw new Error('答卷工作表不存在');
    let sharedStrings = [];
    const sharedFile = zip.file('xl/sharedStrings.xml');
    if (sharedFile) {
      const sharedDoc = xmlDocument(await sharedFile.async('string'));
      sharedStrings = localElements(sharedDoc, 'si').map(nodeText);
    }
    const sheet = xmlDocument(await sheetFile.async('string'));
    return localElements(sheet, 'row').map(rowNode => {
      const row = [];
      localElements(rowNode, 'c').forEach(cellNode => {
        const index = excelColumnIndex(cellNode.getAttribute('r'));
        const type = cellNode.getAttribute('t');
        const raw = localElements(cellNode, 'v')[0]?.textContent || '';
        let value = raw;
        if (type === 's') value = sharedStrings[Number(raw)] ?? '';
        else if (type === 'inlineStr') value = nodeText(cellNode);
        else if (type === 'b') value = raw === '1' ? 'TRUE' : 'FALSE';
        row[index] = value;
      });
      return row;
    });
  }

  function parseHtmlTable(text) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const table = doc.querySelector('table');
    if (!table) throw new Error('旧版 Excel 文件中没有可识别的表格');
    return [...table.rows].map(row => [...row.cells].map(cell => (cell.textContent || '').trim()));
  }

  function parseSpreadsheetXml(text) {
    const doc = xmlDocument(text);
    const rows = [];
    localElements(doc, 'Row').forEach(rowNode => {
      const row = [];
      let cursor = 0;
      localElements(rowNode, 'Cell').forEach(cellNode => {
        const indexAttribute = [...cellNode.attributes].find(item => item.localName === 'Index');
        if (indexAttribute) cursor = Math.max(0, Number(indexAttribute.value) - 1);
        row[cursor] = localElements(cellNode, 'Data')[0]?.textContent || '';
        cursor += 1;
      });
      rows.push(row);
    });
    return rows;
  }

  async function spreadsheetRows(file) {
    const extension = String(file.name || '').split('.').pop().toLowerCase();
    if (extension === 'csv') return parseCsvText(await file.text());
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 8));
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return parseXlsxBuffer(buffer);
    let text = new TextDecoder('utf-8').decode(buffer);
    if ((text.match(/�/g) || []).length > 4) {
      try { text = new TextDecoder('gb18030').decode(buffer); } catch (_) {}
    }
    if (/<table[\s>]/i.test(text)) return parseHtmlTable(text);
    if (/<(?:\w+:)?Workbook[\s>]/i.test(text)) return parseSpreadsheetXml(text);
    throw new Error('暂不支持二进制 .xls，请在问卷星下载 .xlsx 或 CSV 后导入');
  }

  function parseSurveyScore(value) {
    const text = String(value == null ? '' : value).trim();
    if (!text || /无法判断|不了解|不适用|未选择|空白/i.test(text)) return null;
    const direct = Number(text);
    if (Number.isFinite(direct) && direct >= 1 && direct <= 5) return direct;
    const match = text.match(/(?:^|[^0-9])([1-5](?:\.0)?)(?:[^0-9]|$)/);
    return match ? Number(match[1]) : null;
  }

  function summarizeScores(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const count = sorted.length;
    if (!count) return { count: 0, mean: null, median: null, standardDeviation: null };
    const mean = sorted.reduce((sum, value) => sum + value, 0) / count;
    const median = count % 2 ? sorted[(count - 1) / 2] : (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
    const variance = sorted.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / count;
    return { count, mean: Math.round(mean * 100) / 100, median: Math.round(median * 100) / 100, standardDeviation: Math.round(Math.sqrt(variance) * 100) / 100 };
  }

  function parseSurveyRows(rows, expected) {
    if (!Array.isArray(rows) || !rows.length) throw new Error('答卷文件没有数据');
    const config = expected || {};
    const mapEntries = (config.questionnaireMap || state.questionnaireMap || []).length ? (config.questionnaireMap || state.questionnaireMap) : buildQuestionnaireMap();
    const codeMap = new Map(mapEntries.map(item => [item.code, item]));
    const columnCount = rows.slice(0, 12).reduce((max, row) => Math.max(max, row.length || 0), 0);
    const headerRows = rows.slice(0, 12);
    const columnHeaders = Array.from({ length: columnCount }, (_, column) => headerRows.map(row => String(row[column] == null ? '' : row[column]).trim()).filter(Boolean).join('｜'));
    const mappedColumns = new Map();
    let roleColumn = -1;
    columnHeaders.forEach((header, column) => {
      if (header.includes('【ROLE】')) roleColumn = column;
      const matches = [...header.matchAll(/【([IF]\d{2,3})】/g)];
      matches.forEach(match => { if (codeMap.has(match[1]) && ![...mappedColumns.values()].some(item => item.code === match[1])) mappedColumns.set(column, codeMap.get(match[1])); });
    });
    if (!mappedColumns.size) throw new Error('没有找到问卷包生成的题目代码，请确认导入的是原始答卷');
    const headerText = columnHeaders.join('｜');
    const marker = headerText.match(/【DM-([A-Z0-9]+)-V(\d+)】/i);
    const expectedCode = String(config.assessmentCode || assessmentCode()).toUpperCase();
    const expectedVersion = Number(config.questionnaireVersion || state.questionnaireVersion || 1);
    if (marker && marker[1].toUpperCase() !== expectedCode) throw new Error('答卷属于另一项评估，评估编号不一致');
    if (marker && Number(marker[2]) !== expectedVersion) throw new Error('答卷版本为 V' + marker[2] + '，当前页面需要 V' + expectedVersion);
    let headerEnd = -1;
    headerRows.forEach((row, rowIndex) => {
      const text = (row || []).map(value => String(value == null ? '' : value)).join('｜');
      if (/【(?:ROLE|[IF]\d{2,3})】|【DM-[A-Z0-9]+-V\d+】/i.test(text)) headerEnd = rowIndex;
    });
    let dataStart = -1;
    for (let rowIndex = headerEnd + 1; rowIndex < rows.length; rowIndex += 1) {
      if ([...mappedColumns.keys()].some(column => parseSurveyScore(rows[rowIndex][column]) != null)) { dataStart = rowIndex; break; }
    }
    if (dataStart < 0) throw new Error('已识别题目，但没有找到 1—5 分的有效答卷');
    const raw = {};
    mapEntries.forEach(item => {
      raw[item.topicId] = raw[item.topicId] || { impact: [], financial: [] };
    });
    const roleCounts = {};
    let responseCount = 0;
    for (let rowIndex = dataStart; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] || [];
      let hasScore = false;
      mappedColumns.forEach((item, column) => {
        const score = parseSurveyScore(row[column]);
        if (score == null) return;
        raw[item.topicId] = raw[item.topicId] || { impact: [], financial: [] };
        raw[item.topicId][item.dimension].push(score);
        hasScore = true;
      });
      if (hasScore) {
        responseCount += 1;
        const role = roleColumn >= 0 ? String(row[roleColumn] || '').trim() : '';
        if (role) roleCounts[role] = (roleCounts[role] || 0) + 1;
      }
    }
    const topicStats = {};
    Object.entries(raw).forEach(([topicId, dimensions]) => {
      const impact = summarizeScores(dimensions.impact);
      const financial = summarizeScores(dimensions.financial);
      topicStats[topicId] = {
        impactCount: impact.count, impactMean: impact.mean, impactMedian: impact.median, impactStandardDeviation: impact.standardDeviation,
        financialCount: financial.count, financialMean: financial.mean, financialMedian: financial.median, financialStandardDeviation: financial.standardDeviation
      };
    });
    const mappedCodes = new Set([...mappedColumns.values()].map(item => item.code));
    const missingCodes = mapEntries.filter(item => !mappedCodes.has(item.code)).map(item => item.code);
    return {
      responseCount, mappedColumns: mappedColumns.size, markerFound: Boolean(marker), topicStats, roleCounts, missingCodes,
      impactTopicCount: Object.values(topicStats).filter(item => item.impactCount).length,
      financialTopicCount: Object.values(topicStats).filter(item => item.financialCount).length,
      warning: !marker ? '未读取到版本标记，已按题目代码匹配' : missingCodes.length ? '缺少 ' + missingCodes.length + ' 个题目列' : ''
    };
  }

  async function importSurveyFile(file) {
    if (!file) return;
    const rows = await spreadsheetRows(file);
    const parsed = parseSurveyRows(rows);
    if (!parsed.responseCount) throw new Error('没有可导入的有效答卷');
    const previousScores = {};
    Object.entries(parsed.topicStats).forEach(([topicId, stats]) => {
      const topic = topicMap().get(topicId);
      if (!topic) return;
      const existing = topicScores(topic);
      const scores = ensureScores(topic);
      previousScores[topicId] = { impact: existing?.impact ?? null, financial: existing?.financial ?? null, origin: state.scoreOrigins[topicId] || '' };
      if (stats.impactCount) scores.impact = clampScore(stats.impactMean);
      if (stats.financialCount) scores.financial = clampScore(stats.financialMean);
      state.scoreOrigins[topicId] = 'survey';
    });
    state.scoringStarted = true;
    state.surveyImport = Object.assign(parsed, {
      fileName: file.name || '问卷答卷', importedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      questionnaireVersion: state.questionnaireVersion, previousScores,
      appliedScores: Object.fromEntries(Object.entries(parsed.topicStats).map(([topicId, stats]) => [topicId, { impact: stats.impactCount ? clampScore(stats.impactMean) : null, financial: stats.financialCount ? clampScore(stats.financialMean) : null }]))
    });
    saveState();
    render();
    showToast('已导入 ' + parsed.responseCount + ' 份有效答卷，可进入第二步复核评分');
  }

  function clearSurveyImport() {
    const imported = state.surveyImport;
    if (!imported) return;
    Object.entries(imported.previousScores || {}).forEach(([topicId, previous]) => {
      const topic = topicMap().get(topicId);
      if (!topic) return;
      const current = topicScores(topic);
      if (!current) return;
      const applied = imported.appliedScores?.[topicId] || {};
      if (applied.impact != null && current.impact === applied.impact) current.impact = previous.impact;
      if (applied.financial != null && current.financial === applied.financial) current.financial = previous.financial;
      state.scoreOrigins[topicId] = previous.origin || '';
      if (current.impact == null && current.financial == null) delete state.scores[topicId];
    });
    state.surveyImport = null;
    state.scoringStarted = selectedTopics().some(topic => completeScores(topic));
    saveState();
    render();
    showToast('本次问卷统计已清除');
  }

  function exportTopicList() {
    const industry = library.industries.find(item => item.id === state.industry)?.name || state.industry;
    const standards = state.standards.map(id => standardById(id)?.name || id).join('；');
    const rows = [['序号', '企业名称', '所属行业', '采用标准', '议题类别', '议题名称', '议题说明', '影响重要性得分', '财务重要性得分', '重要性结论', '重要性阈值', '评分依据与备注', '参考来源']];
    selectedTopics().forEach((topic, index) => {
      const scores = topicScores(topic) || {};
      rows.push([
        index + 1, state.companyName || '', industry, standards, CATEGORY_NAMES[topic.category], displayName(topic),
        topic.description, validScore(scores.impact) ? Number(scores.impact).toFixed(1) : '', validScore(scores.financial) ? Number(scores.financial).toFixed(1) : '', classification(topic).label,
        Number(state.threshold).toFixed(1), state.notes[topic.id] || '', topic.source || '企业自定义'
      ]);
    });
    const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), safeFilename(state.companyName) + '_双重重要性议题清单.csv');
  }

  function exportMatrixImage() {
    if (!scoredTopics().length) { showToast('尚未形成双维分数，无法导出矩阵', 'error'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 1180;
    const context = canvas.getContext('2d');
    const chart = { left: 190, top: 190, width: 1050, height: 800 };
    const pointColors = { E: '#138a61', S: '#2878b8', G: '#d48a24' };
    const colors = matrixColors();
    const scoreX = score => chart.left + ((score - 1) / 4) * chart.width;
    const scoreY = score => chart.top + chart.height - ((score - 1) / 4) * chart.height;
    const thresholdX = scoreX(state.threshold);
    const thresholdY = scoreY(state.threshold);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#17382e';
    context.font = '700 42px sans-serif';
    context.fillText((state.companyName || '本次评估') + '｜双重重要性矩阵', 70, 68);
    context.fillStyle = colors.single;
    context.fillRect(chart.left, chart.top, thresholdX - chart.left, thresholdY - chart.top);
    context.fillStyle = colors.double;
    context.fillRect(thresholdX, chart.top, chart.left + chart.width - thresholdX, thresholdY - chart.top);
    context.fillStyle = colors.none;
    context.fillRect(chart.left, thresholdY, thresholdX - chart.left, chart.top + chart.height - thresholdY);
    context.fillStyle = colors.single;
    context.fillRect(thresholdX, thresholdY, chart.left + chart.width - thresholdX, chart.top + chart.height - thresholdY);

    context.strokeStyle = '#dfe8e2';
    context.lineWidth = 2;
    context.fillStyle = '#768a80';
    context.font = '20px sans-serif';
    context.textAlign = 'center';
    for (let score = 1; score <= 5; score += 1) {
      const x = scoreX(score);
      const y = scoreY(score);
      context.beginPath();
      context.moveTo(x, chart.top);
      context.lineTo(x, chart.top + chart.height);
      context.moveTo(chart.left, y);
      context.lineTo(chart.left + chart.width, y);
      context.stroke();
      context.fillText(String(score), x, chart.top + chart.height + 35);
      context.textAlign = 'right';
      context.fillText(String(score), chart.left - 22, y + 7);
      context.textAlign = 'center';
    }

    context.strokeStyle = '#a97039';
    context.lineWidth = 3;
    context.setLineDash([12, 10]);
    context.beginPath();
    context.moveTo(thresholdX, chart.top);
    context.lineTo(thresholdX, chart.top + chart.height);
    context.moveTo(chart.left, thresholdY);
    context.lineTo(chart.left + chart.width, thresholdY);
    context.stroke();
    context.setLineDash([]);

    const exportPoints = matrixPointLayout(scoredTopics()).map(point => ({
      ...point,
      x: chart.left + ((point.x - 72) / 468) * chart.width,
      y: chart.top + ((point.y - 84) / 438) * chart.height,
      baseX: chart.left + ((point.baseX - 72) / 468) * chart.width,
      baseY: chart.top + ((point.baseY - 84) / 438) * chart.height
    }));
    exportPoints.forEach(point => {
      const { topic, index, x, y } = point;
      context.beginPath();
      context.arc(x, y, 14, 0, Math.PI * 2);
      context.fillStyle = pointColors[topic.category] || '#607d72';
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 3;
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = '700 12px sans-serif';
      context.textAlign = 'center';
      context.fillText(String(index + 1), x, y + 4);
    });

    context.fillStyle = '#355f4b';
    context.font = '700 24px sans-serif';
    context.textAlign = 'center';
    context.fillText('财务重要性 →', chart.left + chart.width / 2, 1068);
    context.save();
    context.translate(62, chart.top + chart.height / 2);
    context.rotate(-Math.PI / 2);
    context.fillText('影响重要性 →', 0, 0);
    context.restore();

    context.textAlign = 'left';
    context.font = '18px sans-serif';
    context.fillStyle = '#4f675c';
    context.fillText('区域', 70, 1146);
    let legendX = 125;
    [['double', '双重重要'], ['single', '单一重要'], ['none', '不重要']].forEach(([key, label]) => {
      context.fillStyle = colors[key];
      context.fillRect(legendX, 1128, 24, 18);
      context.strokeStyle = '#b9c8c0';
      context.lineWidth = 1;
      context.strokeRect(legendX, 1128, 24, 18);
      context.fillStyle = '#4f675c';
      context.fillText(label, legendX + 34, 1146);
      legendX += label === '双重重要' ? 142 : 124;
    });
    context.fillText('议题', legendX + 12, 1146);
    legendX += 68;
    [['#138a61', '环境'], ['#2878b8', '社会'], ['#d48a24', '治理']].forEach(item => {
      context.beginPath();
      context.arc(legendX, 1140, 8, 0, Math.PI * 2);
      context.fillStyle = item[0];
      context.fill();
      context.fillStyle = '#6e8178';
      context.fillText(item[1], legendX + 15, 1146);
      legendX += 90;
    });

    canvas.toBlob(blob => {
      if (blob) downloadBlob(blob, safeFilename(state.companyName) + '_双重重要性矩阵.png');
    }, 'image/png');
  }

  function handleInput(event) {
    const target = event.target;
    if (target.matches('[name="companyName"]')) {
      state.companyName = target.value;
      saveState();
      return;
    }
    if (target.matches('[data-topic-name]')) {
      state.names[target.dataset.topicName] = target.value.trim();
      saveState();
      return;
    }
    if (target.matches('[data-matrix-color]')) {
      const key = target.dataset.matrixColor;
      if (!Object.hasOwn(DEFAULT_MATRIX_COLORS, key)) return;
      state.matrixColors[key] = normalizeColor(target.value, DEFAULT_MATRIX_COLORS[key]);
      const swatch = target.parentElement?.querySelector('i');
      if (swatch) swatch.style.background = state.matrixColors[key];
      saveState();
      updateResultsOnly();
      return;
    }
    if (target.matches('[data-score]')) {
      const [id, dimension] = target.dataset.score.split(':');
      const topic = topicMap().get(id);
      if (!topic) return;
      const wasComplete = completeScores(topic);
      ensureScores(topic)[dimension] = clampScore(target.value);
      state.scoringStarted = true;
      state.scoreOrigins[id] = state.surveyImport ? 'reviewed' : 'internal';
      target.closest('.dm-score-control')?.classList.remove('is-unset');
      const output = document.querySelector('[data-score-output="' + id + ':' + dimension + '"]');
      if (output) output.textContent = ensureScores(topic)[dimension].toFixed(1);
      saveState();
      if (!wasComplete && allScoresComplete()) render();
      else updateResultsOnly();
      return;
    }
    if (target.matches('[data-threshold]')) {
      state.threshold = clampScore(target.value);
      const output = document.querySelector('[data-threshold-output]');
      if (output) output.textContent = Number(state.threshold).toFixed(1);
      saveState();
      updateResultsOnly();
      return;
    }
    if (target.matches('[data-note]')) {
      state.notes[target.dataset.note] = target.value;
      saveState();
    }
  }

  function handleChange(event) {
    const target = event.target;
    if (target.matches('[name="companyName"],[data-topic-name]')) {
      saveState();
      setTimeout(render, 0);
      return;
    }
    if (target.matches('[data-survey-file]')) {
      const file = target.files && target.files[0];
      target.value = '';
      importSurveyFile(file).catch(error => showToast(error.message || '答卷导入失败', 'error'));
      return;
    }
    if (target.matches('[name="industry"]')) {
      state.industry = target.value;
      saveState();
      render();
      return;
    }
    if (target.matches('[name="standard"]')) {
      const standards = [...document.querySelectorAll('[name="standard"]:checked')].map(input => input.value);
      if (!standards.length) { target.checked = true; return; }
      state.standards = standards;
      saveState();
      render();
      return;
    }
    if (target.matches('[data-topic-select]')) {
      const id = target.dataset.topicSelect;
      state.selected = target.checked ? [...new Set([...state.selected, id])] : state.selected.filter(item => item !== id);
      saveState();
      render();
    }
  }

  function handleSubmit(event) {
    if (event.target.id !== 'dm-custom-form') return;
    event.preventDefault();
    const values = new FormData(event.target);
    const name = String(values.get('topicName') || '').trim();
    if (!name) return;
    const id = 'custom-' + Date.now().toString(36);
    const topic = {
      id, custom: true, category: String(values.get('topicCategory') || 'E'), name,
      description: String(values.get('topicDescription') || '').trim() || '企业结合自身活动、价值链或利益相关方识别的特色议题。',
      standards: [], industries: [state.industry], impact: 3, financial: 3, source: '企业自定义'
    };
    state.customTopics.push(topic);
    state.selected.push(id);
    saveState();
    render();
  }

  function handleClick(event) {
    const button = event.target.closest('button,[data-matrix-topic]');
    if (!button) return;
    if (button.dataset.step) {
      const step = Number(button.dataset.step);
      const allowed = step === 1 || (step === 2 && state.standards.length) || (step === 3 && state.selected.length) || (step === 4 && state.selected.length && canOpenScores());
      if (allowed) { state.step = step; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      return;
    }
    const action = button.dataset.action;
    if (action === 'apply-recommendations') { applyRecommendations(); render(); }
    if (action === 'next-topics') { applyRecommendations(); state.step = 2; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (action === 'back-setup') { state.step = 1; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (action === 'next-questionnaire') { state.step = 3; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (action === 'back-library') { state.step = 2; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (action === 'start-internal-scoring') {
      state.scoringStarted = true;
      state.activeScoreTopicId = selectedTopics().find(topic => !completeScores(topic))?.id || selectedTopics()[0]?.id || '';
      state.step = 4;
      saveState();
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      showToast('已进入内部评分，请逐项完成两个维度');
    }
    if (action === 'go-scores' && canOpenScores()) { state.step = 4; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (action === 'back-topics') { state.step = 3; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (action === 'export-questionnaire') exportQuestionnairePackage().catch(error => showToast(error.message || '问卷包导出失败', 'error'));
    if (action === 'select-survey-file') document.querySelector('[data-survey-file]')?.click();
    if (action === 'clear-survey-import') clearSurveyImport();
    if (action === 'export-matrix') exportMatrixImage();
    if (action === 'export-list') exportTopicList();
    if (action === 'print') window.print();
    if (button.dataset.category) {
      state.categoryFilter = button.dataset.category;
      const filtered = selectedTopics().filter(topic => state.categoryFilter === 'all' || topic.category === state.categoryFilter);
      if (filtered.length && !filtered.some(topic => topic.id === state.activeScoreTopicId)) state.activeScoreTopicId = filtered[0].id;
      saveState();
      render();
    }
    if (button.dataset.topicView) { state.topicView = button.dataset.topicView; saveState(); render(); }
    if (button.dataset.scoreTopic) { state.activeScoreTopicId = button.dataset.scoreTopic; saveState(); render(); }
    if (action === 'previous-score' || action === 'next-score') {
      const topics = selectedTopics();
      const current = Math.max(0, topics.findIndex(topic => topic.id === state.activeScoreTopicId));
      const next = action === 'previous-score' ? current - 1 : current + 1;
      if (topics[next]) { state.activeScoreTopicId = topics[next].id; saveState(); render(); }
    }
    if (button.dataset.matrixTopic) {
      state.activeScoreTopicId = button.dataset.matrixTopic;
      saveState();
      render();
      document.querySelector('.dm-score-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function initialize() {
    const root = document.getElementById('materiality-app');
    if (!root) return;
    try {
      library = window.MaterialityTopicLibrary;
      if (!library || !Array.isArray(library.topics)) throw new Error('议题库读取失败');
      state = loadState();
      if (!state.assessmentId) state.assessmentId = createAssessmentId();
      state.questionnaireVersion = Math.max(1, Number(state.questionnaireVersion) || 1);
      if (!Array.isArray(state.questionnaireMap)) state.questionnaireMap = [];
      if (!state.scoreOrigins || typeof state.scoreOrigins !== 'object') state.scoreOrigins = {};
      const ids = new Set(allTopics().map(topic => topic.id));
      state.selected = state.selected.filter(id => ids.has(id));
      if (!state.selected.length) applyRecommendations();
      if (!state.selected.includes(state.activeScoreTopicId)) state.activeScoreTopicId = state.selected[0] || '';
      if (state.step === 4 && !canOpenScores()) state.step = 3;
      render();
      root.addEventListener('input', handleInput);
      root.addEventListener('change', handleChange);
      root.addEventListener('submit', handleSubmit);
      root.addEventListener('click', handleClick);
      root.addEventListener('keydown', event => {
        const point = event.target.closest('[data-matrix-topic]');
        if (point && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); point.click(); }
      });
    } catch (error) {
      root.innerHTML = '<div class="dm-load-error"><strong>议题库暂时无法加载</strong><p>' + escapeHtml(error.message) + '，请刷新页面重试。</p><a href="' + pageHref('community.html#co-projects') + '">返回项目与工具</a></div>';
    }
  }

  window.MaterialityTool = {
    clampScore,
    csvCell,
    parseCsvText,
    parseSurveyScore,
    summarizeScores,
    parseSurveyRows,
    questionnairePackageFiles,
    spreadPoints,
    classify(scores, threshold) {
      if (!scores || !validScore(scores.impact) || !validScore(scores.financial)) return 'unscored';
      const impact = scores.impact >= threshold;
      const financial = scores.financial >= threshold;
      return impact && financial ? 'double' : impact ? 'impact' : financial ? 'financial' : 'below';
    },
    recommended(libraryData, industry, standards) {
      library = libraryData;
      state = Object.assign(emptyState(), { industry, standards });
      return recommendedIds();
    }
  };
  document.addEventListener('DOMContentLoaded', initialize);
})();
