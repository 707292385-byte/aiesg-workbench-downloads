(function () {
  'use strict';

  const STORAGE_KEY = 'aiesg-double-materiality-v1';
  const CATEGORY_NAMES = { E: '环境', S: '社会', G: '治理' };
  const CATEGORY_COLORS = { E: '#138a61', S: '#2878b8', G: '#d48a24' };
  const DEFAULT_STANDARDS = ['ashare', 'esrs'];
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
      companyName: '',
      industry: 'general',
      standards: DEFAULT_STANDARDS.slice(),
      selected: [],
      customTopics: [],
      names: {},
      scores: {},
      notes: {},
      threshold: 3,
      categoryFilter: 'all',
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
      return parsed && typeof parsed === 'object' ? Object.assign(emptyState(), parsed) : emptyState();
    } catch (_) {
      return emptyState();
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
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

  function recommendedIds() {
    return library.topics
      .filter(matchesStandards)
      .filter(topic => state.industry === 'general'
        ? topic.industries.includes('general') || recommendationStrength(topic) >= 2
        : topic.industries.includes(state.industry) || topic.industries.includes('general') || recommendationStrength(topic) >= 3)
      .sort((left, right) => recommendationStrength(right) - recommendationStrength(left) || right.impact + right.financial - left.impact - left.financial)
      .slice(0, state.industry === 'general' ? 18 : 22)
      .map(topic => topic.id);
  }

  function ensureScores(topic) {
    if (!state.scores[topic.id]) {
      const industryBoost = topic.industries.includes(state.industry) && state.industry !== 'general' ? 0.3 : 0;
      state.scores[topic.id] = {
        impact: clampScore(topic.impact + industryBoost),
        financial: clampScore(topic.financial + industryBoost)
      };
    }
    return state.scores[topic.id];
  }

  function applyRecommendations() {
    const customSelected = state.selected.filter(id => state.customTopics.some(topic => topic.id === id));
    state.selected = [...new Set([...recommendedIds(), ...customSelected])];
    state.selected.forEach(id => {
      const topic = topicMap().get(id);
      if (topic) ensureScores(topic);
    });
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
    const scores = ensureScores(topic);
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
      + '<div class="dm-header-main"><div><span class="dm-eyebrow">DOUBLE MATERIALITY ASSESSMENT</span><h1>双重重要性评估</h1><p>从行业和披露标准形成候选议题，再用影响重要性与财务重要性完成排序和矩阵展示。</p></div>'
      + '<div class="dm-header-mark" aria-hidden="true"><b>2</b><span>个维度</span></div></div>'
      + '</header>';
  }

  function renderStepper() {
    return '<nav class="dm-stepper" aria-label="评估步骤">'
      + '<button type="button" class="' + (state.step === 1 ? 'is-active' : 'is-complete') + '" data-step="1"><b>01</b><span><strong>识别议题清单</strong><small>企业、行业与标准</small></span></button>'
      + '<i aria-hidden="true"></i>'
      + '<button type="button" class="' + (state.step === 2 ? 'is-active' : '') + '" data-step="2" ' + (state.selected.length ? '' : 'disabled') + '><b>02</b><span><strong>评分与矩阵</strong><small>阈值、分数与结果</small></span></button>'
      + '</nav>';
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
      + '<div class="dm-recommend-bar"><div><strong>当前可推荐 ' + recommendedIds().length + ' 个议题</strong><small>综合标准覆盖、行业相关性和通用治理要求</small></div><button type="button" data-action="apply-recommendations">应用本次推荐</button></div>'
      + '</section>';
  }

  function sourceTags(topic) {
    return topic.standards.map(id => standardById(id)).filter(Boolean).map(item => '<span>' + escapeHtml(item.short) + '</span>').join('');
  }

  function renderTopicCard(topic, recommended) {
    const selected = state.selected.includes(topic.id);
    return '<article class="dm-topic dm-topic--' + topic.category.toLowerCase() + (selected ? ' is-selected' : '') + '" data-topic-card="' + topic.id + '">'
      + '<div class="dm-topic-select"><label><input type="checkbox" data-topic-select="' + topic.id + '"' + (selected ? ' checked' : '') + '><span aria-hidden="true"></span></label><b>' + escapeHtml(CATEGORY_NAMES[topic.category]) + '</b>' + (recommended ? '<small>推荐</small>' : '') + '</div>'
      + '<input class="dm-topic-name" data-topic-name="' + topic.id + '" value="' + escapeHtml(displayName(topic)) + '" aria-label="修改' + escapeHtml(topic.name) + '的名称">'
      + '<p>' + escapeHtml(topic.description) + '</p><div class="dm-topic-sources">' + (topic.custom ? '<span>企业自定义</span>' : sourceTags(topic)) + '</div>'
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
      return Number(recommended.has(b.id)) - Number(recommended.has(a.id));
    });
    const cards = visible.map(topic => renderTopicCard(topic, recommended.has(topic.id))).join('');
    const selectedCount = state.selected.length;
    return '<section class="dm-library dm-panel"><div class="dm-panel-head dm-topic-head"><div><small>候选议题库</small><h2>选择并校准议题清单</h2></div><div class="dm-selection-count"><strong>' + selectedCount + '</strong><span>已选议题</span></div></div>'
      + renderCustomTopicForm()
      + '<div class="dm-library-note"><span>名称可直接修改</span><p>议题说明与来源标签保留在卡片中，避免同名议题的边界被误解。</p></div>'
      + '<div class="dm-topic-grid">' + cards + '</div>'
      + '<footer class="dm-step-actions"><div><small>方法来源</small><p>' + escapeHtml(library.methodology) + '</p></div><div class="dm-step-action-buttons"><button type="button" class="dm-secondary" data-action="export-questionnaire"' + (selectedCount ? '' : ' disabled') + '>导出问卷包</button><button type="button" class="dm-primary" data-action="go-scores"' + (selectedCount ? '' : ' disabled') + '>进入评分与矩阵 <span>→</span></button></div></footer>'
      + '</section>';
  }

  function renderStepOne() {
    return '<div class="dm-page dm-page--topics">' + renderCompanySetup() + renderTopicLibrary() + '</div>';
  }

  function matrixPosition(score, axis) {
    return axis === 'x' ? 72 + ((score - 1) / 4) * 468 : 522 - ((score - 1) / 4) * 438;
  }

  function spreadPoints(points, minDistance = 31, bounds = { minX: 88, maxX: 524, minY: 100, maxY: 506 }) {
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
    return spreadPoints(topics.map((topic, index) => {
      const scores = ensureScores(topic);
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
    const topics = selectedTopics();
    const thresholdX = matrixPosition(state.threshold, 'x');
    const thresholdY = matrixPosition(state.threshold, 'y');
    const grid = [1, 2, 3, 4, 5].map(value => {
      const x = matrixPosition(value, 'x');
      const y = matrixPosition(value, 'y');
      return '<line x1="' + x + '" x2="' + x + '" y1="84" y2="522"/><line x1="72" x2="540" y1="' + y + '" y2="' + y + '"/><text x="' + x + '" y="548">' + value + '</text><text x="53" y="' + (y + 4) + '">' + value + '</text>';
    }).join('');
    const points = matrixPointLayout(topics).map(point => {
      const { topic, index, scores, baseX, baseY, x, y } = point;
      const label = displayName(topic);
      const number = index + 1;
      const leader = Math.hypot(x - baseX, y - baseY) > 2 ? '<line class="dm-point-leader" x1="' + baseX + '" y1="' + baseY + '" x2="' + x + '" y2="' + y + '"></line>' : '';
      return leader + '<g class="dm-point dm-point--' + topic.category.toLowerCase() + '" tabindex="0" role="button" data-matrix-topic="' + topic.id + '" aria-label="' + escapeHtml(label) + '，影响重要性' + scores.impact + '，财务重要性' + scores.financial + '"><circle cx="' + x + '" cy="' + y + '" r="13"></circle><text x="' + x + '" y="' + (y + 4) + '">' + number + '</text><title>' + escapeHtml(label) + '｜影响 ' + scores.impact + '｜财务 ' + scores.financial + '</title></g>';
    }).join('');
    return '<svg class="dm-matrix" viewBox="0 0 600 590" role="img" aria-labelledby="dm-matrix-title dm-matrix-desc">'
      + '<title id="dm-matrix-title">双重重要性矩阵</title><desc id="dm-matrix-desc">横轴是财务重要性，纵轴是影响重要性，虚线为当前阈值。</desc>'
      + '<rect class="dm-quadrant q-impact" x="72" y="84" width="' + Math.max(0, thresholdX - 72) + '" height="' + Math.max(0, thresholdY - 84) + '"></rect>'
      + '<rect class="dm-quadrant q-double" x="' + thresholdX + '" y="84" width="' + Math.max(0, 540 - thresholdX) + '" height="' + Math.max(0, thresholdY - 84) + '"></rect>'
      + '<rect class="dm-quadrant q-financial" x="' + thresholdX + '" y="' + thresholdY + '" width="' + Math.max(0, 540 - thresholdX) + '" height="' + Math.max(0, 522 - thresholdY) + '"></rect>'
      + '<g class="dm-grid">' + grid + '</g><line class="dm-threshold-line" x1="' + thresholdX + '" x2="' + thresholdX + '" y1="84" y2="522"></line><line class="dm-threshold-line" x1="72" x2="540" y1="' + thresholdY + '" y2="' + thresholdY + '"></line>'
      + '<line class="dm-axis" x1="72" x2="540" y1="522" y2="522"></line><line class="dm-axis" x1="72" x2="72" y1="84" y2="522"></line>'
      + '<text class="dm-axis-title" x="306" y="579">财务重要性 →</text><text class="dm-axis-title" x="-305" y="20" transform="rotate(-90)">影响重要性 →</text>'
      + '<text class="dm-quadrant-label" x="88" y="108">影响重要</text><text class="dm-quadrant-label" x="' + (thresholdX + 14) + '" y="108">双重重要</text><text class="dm-quadrant-label" x="' + (thresholdX + 14) + '" y="' + (thresholdY + 25) + '">财务重要</text>'
      + '<g class="dm-points">' + points + '</g></svg>';
  }

  function scoreSummary() {
    const counts = { double: 0, impact: 0, financial: 0, below: 0 };
    selectedTopics().forEach(topic => counts[classification(topic).key] += 1);
    return counts;
  }

  function renderScoreRow(topic, index) {
    const scores = ensureScores(topic);
    const result = classification(topic);
    const note = state.notes[topic.id] || '';
    const survey = state.surveyImport && state.surveyImport.topicStats ? state.surveyImport.topicStats[topic.id] : null;
    const surveyNote = survey ? '<div class="dm-survey-score-note"><span>问卷 ' + Math.max(survey.impactCount || 0, survey.financialCount || 0) + ' 份</span>'
      + (survey.impactCount ? '<small>影响均值 ' + Number(survey.impactMean).toFixed(1) + '</small>' : '')
      + (survey.financialCount ? '<small>财务均值 ' + Number(survey.financialMean).toFixed(1) + '</small>' : '') + '</div>' : '';
    return '<article class="dm-score-row dm-score-row--' + topic.category.toLowerCase() + '" data-score-row="' + topic.id + '">'
      + '<div class="dm-score-topic"><span>' + (index + 1) + '</span><div><small>' + CATEGORY_NAMES[topic.category] + '</small><strong>' + escapeHtml(displayName(topic)) + '</strong>' + surveyNote + '</div><b class="dm-result dm-result--' + result.key + '" data-result="' + topic.id + '">' + result.label + '</b></div>'
      + '<label class="dm-score-control"><span>影响重要性 <output data-score-output="' + topic.id + ':impact">' + scores.impact.toFixed(1) + '</output></span><input type="range" min="1" max="5" step="0.1" value="' + scores.impact + '" data-score="' + topic.id + ':impact"></label>'
      + '<label class="dm-score-control"><span>财务重要性 <output data-score-output="' + topic.id + ':financial">' + scores.financial.toFixed(1) + '</output></span><input type="range" min="1" max="5" step="0.1" value="' + scores.financial + '" data-score="' + topic.id + ':financial"></label>'
      + '<details class="dm-evidence"><summary>评分依据与备注</summary><textarea data-note="' + topic.id + '" rows="3" placeholder="记录利益相关方反馈、风险事件、数据证据或管理层判断…">' + escapeHtml(note) + '</textarea></details>'
      + '</article>';
  }

  function renderScoreList() {
    const topics = selectedTopics().filter(topic => state.categoryFilter === 'all' || topic.category === state.categoryFilter);
    return '<section class="dm-score-list dm-panel"><div class="dm-panel-head"><div><small>逐项校准</small><h2>调整议题分数</h2></div><p>拖动任一维度的分数，矩阵、分类和统计会立即更新。展开备注可保留评分证据。</p></div>'
      + '<div class="dm-filter-tabs" role="group" aria-label="按类别筛选">' + [['all','全部'],['E','环境'],['S','社会'],['G','治理']].map(item => '<button type="button" data-category="' + item[0] + '" class="' + (state.categoryFilter === item[0] ? 'is-active' : '') + '">' + item[1] + '</button>').join('') + '</div>'
      + '<div class="dm-score-rows">' + topics.map((topic, index) => renderScoreRow(topic, index)).join('') + '</div></section>';
  }

  function renderAssessmentProcess() {
    const steps = [
      ['01', '确定评估边界', '企业、行业与适用标准'],
      ['02', '识别候选议题', '业务活动、价值链与利益相关方'],
      ['03', '收集判断证据', '影响、风险、机遇与反馈'],
      ['04', '开展双维评分', '影响重要性 × 财务重要性'],
      ['05', '审议并形成披露', '阈值、矩阵、清单与报告映射']
    ];
    return '<section class="dm-assessment-process dm-panel"><div class="dm-process-head"><div><small>方法流程</small><h2>双重重要性评估怎样完成</h2></div><p>先形成可解释的证据链，再确定分数、阈值和披露结论。</p></div><div class="dm-process-flow">'
      + steps.map((step, index) => '<div class="dm-process-step' + (index < 2 ? ' is-done' : index < 4 ? ' is-current' : '') + '"><b>' + step[0] + '</b><span><strong>' + step[1] + '</strong><small>' + step[2] + '</small></span></div>').join('')
      + '</div></section>';
  }

  function renderSurveyEvidence() {
    const imported = state.surveyImport;
    const exportStatus = state.questionnaireExportedAt
      ? '问卷包 V' + state.questionnaireVersion + ' · ' + state.selected.length + ' 个议题'
      : '尚未导出问卷包';
    const result = imported
      ? '<div class="dm-survey-result"><div><small>有效答卷</small><strong>' + imported.responseCount + '</strong></div><div><small>已匹配题列</small><strong>' + imported.mappedColumns + '</strong></div><div><small>有影响得分</small><strong>' + imported.impactTopicCount + '</strong></div><div><small>有财务得分</small><strong>' + imported.financialTopicCount + '</strong></div></div>'
        + '<p class="dm-survey-file">已导入：' + escapeHtml(imported.fileName) + ' · ' + escapeHtml(imported.importedAt) + (imported.warning ? ' · ' + escapeHtml(imported.warning) : '') + '</p>'
      : '<div class="dm-survey-empty"><b>回收完成后导入原始答卷</b><span>支持问卷星下载的 .xlsx、CSV；旧版 .xls 如为网页表格或 XML 也可读取。</span></div>';
    return '<section class="dm-survey-panel dm-panel"><div class="dm-survey-copy"><small>问卷证据</small><h2>从问卷包到答卷统计</h2><p>题目内置简短识别码。导入时按识别码匹配议题，不依赖问卷题序。</p><div class="dm-survey-flow"><span><b>1</b>导出问卷包</span><i>→</i><span><b>2</b>问卷星回收</span><i>→</i><span><b>3</b>导入 Excel</span><i>→</i><span><b>4</b>更新矩阵</span></div></div>'
      + '<div class="dm-survey-actions"><div><small>当前状态</small><strong>' + escapeHtml(exportStatus) + '</strong></div><button type="button" data-action="export-questionnaire">导出问卷包</button><button type="button" class="dm-primary" data-action="select-survey-file">导入答卷 Excel</button><input type="file" data-survey-file accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>' + (imported ? '<button type="button" class="dm-link-button" data-action="clear-survey-import">清除本次导入</button>' : '') + '</div>'
      + '<div class="dm-survey-summary">' + result + '</div></section>';
  }

  function renderResults() {
    const summary = scoreSummary();
    return '<section class="dm-results dm-panel"><div class="dm-result-toolbar"><div><small>结果视图</small><h2>' + escapeHtml(state.companyName || '本次评估') + '</h2></div><div class="dm-toolbar-actions"><button type="button" data-action="export-matrix">导出矩阵图片</button><button type="button" data-action="export-list">导出议题清单</button><button type="button" data-action="print">打印</button></div></div>'
      + '<div class="dm-result-layout"><div class="dm-matrix-column"><div class="dm-matrix-wrap" data-matrix-wrap>' + renderMatrix() + '</div><div class="dm-legend"><span><i class="e"></i>环境</span><span><i class="s"></i>社会</span><span><i class="g"></i>治理</span><small>引导线连接原始得分坐标，圆点编号对应下方议题顺序</small></div></div>'
      + '<aside class="dm-result-side"><div class="dm-side-title"><small>结果概览</small><strong>' + state.selected.length + ' 个议题</strong></div><div class="dm-summary" aria-live="polite"><div><strong data-summary="double">' + summary.double + '</strong><span>双重重要</span></div><div><strong data-summary="impact">' + summary.impact + '</strong><span>仅影响重要</span></div><div><strong data-summary="financial">' + summary.financial + '</strong><span>仅财务重要</span></div><div><strong data-summary="below">' + summary.below + '</strong><span>低于阈值</span></div></div><div class="dm-threshold"><label><span>重要性阈值</span><input type="range" min="1.5" max="4.5" step="0.1" value="' + state.threshold + '" data-threshold><output data-threshold-output>' + Number(state.threshold).toFixed(1) + '</output></label><p>两个维度分别与阈值比较。阈值应由企业批准，并保留判断依据。</p></div><div class="dm-result-rule"><b>判定方式</b><span>双维均达阈值：双重重要</span><span>单维达阈值：影响或财务重要</span></div></aside></div>'
      + '</section>';
  }

  function renderStepTwo() {
    return '<div class="dm-page dm-page--scores"><div class="dm-score-intro"><button type="button" data-action="back-topics">← 返回议题清单</button><p><strong>' + state.selected.length + ' 个议题进入评估</strong><span>建议在评分前明确参与人员、评分尺度和证据要求。</span></p></div>' + renderAssessmentProcess() + renderSurveyEvidence() + renderResults() + renderScoreList()
      + '<section class="dm-method-note"><strong>评分建议</strong><p>影响重要性可从影响规模、范围、不可补救性与发生可能性判断；财务重要性可从风险或机遇的金额、发生可能性和时间范围判断。当前分数是启动值，应由跨部门与利益相关方证据校准。</p></section></div>';
  }

  function render() {
    const root = document.getElementById('materiality-app');
    if (!root) return;
    root.innerHTML = '<div class="dm-shell">' + renderHeader() + renderStepper() + (state.step === 1 ? renderStepOne() : renderStepTwo()) + '<footer class="dm-footer"><span>议题库版本 ' + escapeHtml(library.version) + '</span><p>' + escapeHtml(library.notice) + '</p></footer><div class="dm-toast" data-toast role="status" aria-live="polite"></div></div>';
  }

  function updateResultsOnly() {
    const wrap = document.querySelector('[data-matrix-wrap]');
    if (wrap) wrap.innerHTML = renderMatrix();
    const summary = scoreSummary();
    Object.entries(summary).forEach(([key, value]) => {
      const node = document.querySelector('[data-summary="' + key + '"]');
      if (node) node.textContent = value;
    });
    selectedTopics().forEach(topic => {
      const result = classification(topic);
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
      + '- 评估编号：`' + state.assessmentId + '`\n- 问卷版本：`V' + state.questionnaireVersion + '`\n- 识别标记：`' + marker + '`\n- 议题数量：' + topics.length + '\n\n'
      + '## 推荐：交给问卷星智能体\n\n1. 安装并连接问卷星官方 `wjx-cli`。\n2. 先执行预检，不创建问卷：\n\n```bash\nwjx survey create --file questionnaire.jsonl --optional_titles ' + "'" + optionalJson + "'" + ' --dry-run\n```\n\n3. 人工核对标题、题目数量、矩阵行、量表和选填题。\n4. 确认后再执行实际创建。问卷星当前 CLI 对普通题型可能直接发布，因此实际创建前必须获得使用者确认；如需草稿，请让智能体使用支持 `publish:false` 的 SDK／MCP 路径。\n5. 回收完成后，在问卷星下载原始答卷 `.xlsx` 或 CSV，再回到双重重要性页面导入。\n\n'
      + '## 文件说明\n\n- `questionnaire.jsonl`：问卷星官方 JSONL 创建文件。\n- `questionnaire-import.txt`：人工阅读或文本导入兜底稿。\n- `topic-question-map.csv`：题目代码与议题的对应关系。\n- `scoring-config.json`：量表和统计口径。\n- `assessment-manifest.json`：企业、标准、议题和问卷版本。\n- `response-import-template.csv`：答卷导入字段示例。\n\n'
      + '## 回导要求\n\n不要删除题目或矩阵行中的 `【I01】`、`【F01】` 等代码，也不要删除问卷标题中的版本标记。题序可以调整；代码和版本标记用于防止答卷错配。\n';
    return {
      'questionnaire.jsonl': jsonl,
      'questionnaire-import.txt': '\ufeff' + textLines.join('\r\n') + '\r\n',
      'topic-question-map.csv': '\ufeff' + mapRows.map(row => row.map(csvCell).join(',')).join('\r\n'),
      'scoring-config.json': JSON.stringify(scoring, null, 2) + '\n',
      'assessment-manifest.json': JSON.stringify(manifest, null, 2) + '\n',
      'response-import-template.csv': '\ufeff' + importHeaders.map(csvCell).join(',') + '\r\n',
      'README.md': readme
    };
  }

  async function exportQuestionnairePackage() {
    if (!window.JSZip) throw new Error('问卷打包组件未加载，请刷新页面后重试');
    const files = questionnairePackageFiles();
    const zip = new window.JSZip();
    Object.entries(files).forEach(([name, content]) => zip.file(name, content));
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
      const scores = ensureScores(topic);
      previousScores[topicId] = { impact: scores.impact, financial: scores.financial };
      if (stats.impactCount) scores.impact = clampScore(stats.impactMean);
      if (stats.financialCount) scores.financial = clampScore(stats.financialMean);
    });
    state.surveyImport = Object.assign(parsed, {
      fileName: file.name || '问卷答卷', importedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
      questionnaireVersion: state.questionnaireVersion, previousScores,
      appliedScores: Object.fromEntries(Object.entries(parsed.topicStats).map(([topicId, stats]) => [topicId, { impact: stats.impactCount ? clampScore(stats.impactMean) : null, financial: stats.financialCount ? clampScore(stats.financialMean) : null }]))
    });
    saveState();
    render();
    showToast('已导入 ' + parsed.responseCount + ' 份有效答卷，矩阵已更新');
  }

  function clearSurveyImport() {
    const imported = state.surveyImport;
    if (!imported) return;
    Object.entries(imported.previousScores || {}).forEach(([topicId, previous]) => {
      const topic = topicMap().get(topicId);
      if (!topic) return;
      const current = ensureScores(topic);
      const applied = imported.appliedScores?.[topicId] || {};
      if (applied.impact != null && current.impact === applied.impact) current.impact = previous.impact;
      if (applied.financial != null && current.financial === applied.financial) current.financial = previous.financial;
    });
    state.surveyImport = null;
    saveState();
    render();
    showToast('本次问卷统计已清除');
  }

  function exportTopicList() {
    const industry = library.industries.find(item => item.id === state.industry)?.name || state.industry;
    const standards = state.standards.map(id => standardById(id)?.name || id).join('；');
    const rows = [['序号', '企业名称', '所属行业', '采用标准', '议题类别', '议题名称', '议题说明', '影响重要性得分', '财务重要性得分', '重要性结论', '重要性阈值', '评分依据与备注', '参考来源']];
    selectedTopics().forEach((topic, index) => {
      const scores = ensureScores(topic);
      rows.push([
        index + 1, state.companyName || '', industry, standards, CATEGORY_NAMES[topic.category], displayName(topic),
        topic.description, scores.impact.toFixed(1), scores.financial.toFixed(1), classification(topic).label,
        Number(state.threshold).toFixed(1), state.notes[topic.id] || '', topic.source || '企业自定义'
      ]);
    });
    const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), safeFilename(state.companyName) + '_双重重要性议题清单.csv');
  }

  function exportMatrixImage() {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 1180;
    const context = canvas.getContext('2d');
    const chart = { left: 190, top: 190, width: 1050, height: 800 };
    const pointColors = { E: '#138a61', S: '#2878b8', G: '#d48a24' };
    const scoreX = score => chart.left + ((score - 1) / 4) * chart.width;
    const scoreY = score => chart.top + chart.height - ((score - 1) / 4) * chart.height;
    const thresholdX = scoreX(state.threshold);
    const thresholdY = scoreY(state.threshold);
    const industry = library.industries.find(item => item.id === state.industry)?.name || state.industry;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#17382e';
    context.font = '700 42px sans-serif';
    context.fillText((state.companyName || '本次评估') + '｜双重重要性矩阵', 70, 68);
    context.fillStyle = '#667c72';
    context.font = '22px sans-serif';
    context.fillText('行业：' + industry + '　阈值：' + Number(state.threshold).toFixed(1) + '　议题：' + state.selected.length + '项', 70, 108);

    context.fillStyle = '#e9f5ee';
    context.fillRect(chart.left, chart.top, thresholdX - chart.left, thresholdY - chart.top);
    context.fillStyle = '#dff2e7';
    context.fillRect(thresholdX, chart.top, chart.left + chart.width - thresholdX, thresholdY - chart.top);
    context.fillStyle = '#edf2f8';
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

    context.fillStyle = '#587064';
    context.font = '700 22px sans-serif';
    context.textAlign = 'left';
    context.fillText('影响重要', chart.left + 24, chart.top + 38);
    context.fillText('双重重要', thresholdX + 24, chart.top + 38);
    context.fillText('财务重要', thresholdX + 24, thresholdY + 38);

    const exportPoints = matrixPointLayout(selectedTopics()).map(point => ({
      ...point,
      x: chart.left + ((point.x - 72) / 468) * chart.width,
      y: chart.top + ((point.y - 84) / 438) * chart.height,
      baseX: chart.left + ((point.baseX - 72) / 468) * chart.width,
      baseY: chart.top + ((point.baseY - 84) / 438) * chart.height
    }));
    exportPoints.forEach(point => {
      if (Math.hypot(point.x - point.baseX, point.y - point.baseY) <= 2) return;
      context.beginPath();
      context.moveTo(point.baseX, point.baseY);
      context.lineTo(point.x, point.y);
      context.strokeStyle = '#9aaca3';
      context.lineWidth = 2;
      context.stroke();
    });
    exportPoints.forEach(point => {
      const { topic, index, x, y } = point;
      context.beginPath();
      context.arc(x, y, 21, 0, Math.PI * 2);
      context.fillStyle = pointColors[topic.category] || '#607d72';
      context.fill();
      context.strokeStyle = '#ffffff';
      context.lineWidth = 4;
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = '700 16px sans-serif';
      context.textAlign = 'center';
      context.fillText(String(index + 1), x, y + 6);
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
    const legend = [['#138a61', '环境'], ['#2878b8', '社会'], ['#d48a24', '治理']];
    let legendX = 70;
    legend.forEach(item => {
      context.beginPath();
      context.arc(legendX, 1140, 8, 0, Math.PI * 2);
      context.fillStyle = item[0];
      context.fill();
      context.fillStyle = '#6e8178';
      context.fillText(item[1], legendX + 15, 1146);
      legendX += 90;
    });
    context.fillText('圆点编号对应导出议题清单中的序号', legendX + 15, 1146);

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
    if (target.matches('[data-score]')) {
      const [id, dimension] = target.dataset.score.split(':');
      const topic = topicMap().get(id);
      if (!topic) return;
      ensureScores(topic)[dimension] = clampScore(target.value);
      const output = document.querySelector('[data-score-output="' + id + ':' + dimension + '"]');
      if (output) output.textContent = ensureScores(topic)[dimension].toFixed(1);
      saveState();
      updateResultsOnly();
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
      const topic = topicMap().get(id);
      if (topic && target.checked) ensureScores(topic);
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
    ensureScores(topic);
    saveState();
    render();
  }

  function handleClick(event) {
    const button = event.target.closest('button,[data-matrix-topic]');
    if (!button) return;
    if (button.dataset.step) {
      const step = Number(button.dataset.step);
      if (step === 1 || (step === 2 && state.selected.length)) { state.step = step; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      return;
    }
    const action = button.dataset.action;
    if (action === 'apply-recommendations') { applyRecommendations(); render(); }
    if (action === 'go-scores') { state.step = 2; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (action === 'back-topics') { state.step = 1; saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    if (action === 'export-questionnaire') exportQuestionnairePackage().catch(error => showToast(error.message || '问卷包导出失败', 'error'));
    if (action === 'select-survey-file') document.querySelector('[data-survey-file]')?.click();
    if (action === 'clear-survey-import') clearSurveyImport();
    if (action === 'export-matrix') exportMatrixImage();
    if (action === 'export-list') exportTopicList();
    if (action === 'print') window.print();
    if (button.dataset.category) { state.categoryFilter = button.dataset.category; saveState(); render(); }
    if (button.dataset.matrixTopic) {
      const row = document.querySelector('[data-score-row="' + button.dataset.matrixTopic + '"]');
      if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('is-highlighted'); setTimeout(() => row.classList.remove('is-highlighted'), 1400); }
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
      const ids = new Set(allTopics().map(topic => topic.id));
      state.selected = state.selected.filter(id => ids.has(id));
      if (!state.selected.length) applyRecommendations();
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
