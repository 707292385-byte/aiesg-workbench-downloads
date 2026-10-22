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
      categoryFilter: 'all'
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
      + '<footer class="dm-step-actions"><div><small>方法来源</small><p>' + escapeHtml(library.methodology) + '</p></div><button type="button" class="dm-primary" data-action="go-scores"' + (selectedCount ? '' : ' disabled') + '>进入评分与矩阵 <span>→</span></button></footer>'
      + '</section>';
  }

  function renderStepOne() {
    return '<div class="dm-page dm-page--topics">' + renderCompanySetup() + renderTopicLibrary() + '</div>';
  }

  function matrixPosition(score, axis) {
    return axis === 'x' ? 72 + ((score - 1) / 4) * 468 : 522 - ((score - 1) / 4) * 438;
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
    const points = topics.map((topic, index) => {
      const scores = ensureScores(topic);
      const x = matrixPosition(scores.financial, 'x');
      const y = matrixPosition(scores.impact, 'y');
      const label = displayName(topic);
      const number = index + 1;
      return '<g class="dm-point dm-point--' + topic.category.toLowerCase() + '" tabindex="0" role="button" data-matrix-topic="' + topic.id + '" aria-label="' + escapeHtml(label) + '，影响重要性' + scores.impact + '，财务重要性' + scores.financial + '"><circle cx="' + x + '" cy="' + y + '" r="13"></circle><text x="' + x + '" y="' + (y + 4) + '">' + number + '</text><title>' + escapeHtml(label) + '｜影响 ' + scores.impact + '｜财务 ' + scores.financial + '</title></g>';
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
    return '<article class="dm-score-row dm-score-row--' + topic.category.toLowerCase() + '" data-score-row="' + topic.id + '">'
      + '<div class="dm-score-topic"><span>' + (index + 1) + '</span><div><small>' + CATEGORY_NAMES[topic.category] + '</small><strong>' + escapeHtml(displayName(topic)) + '</strong></div><b class="dm-result dm-result--' + result.key + '" data-result="' + topic.id + '">' + result.label + '</b></div>'
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

  function renderResults() {
    const summary = scoreSummary();
    return '<section class="dm-results dm-panel"><div class="dm-result-toolbar"><div><small>结果视图</small><h2>' + escapeHtml(state.companyName || '本次评估') + '</h2></div><div class="dm-toolbar-actions"><button type="button" data-action="export">导出结果</button><button type="button" data-action="print">打印</button></div></div>'
      + '<div class="dm-summary" aria-live="polite"><div><strong data-summary="double">' + summary.double + '</strong><span>双重重要</span></div><div><strong data-summary="impact">' + summary.impact + '</strong><span>仅影响重要</span></div><div><strong data-summary="financial">' + summary.financial + '</strong><span>仅财务重要</span></div><div><strong data-summary="below">' + summary.below + '</strong><span>低于阈值</span></div></div>'
      + '<div class="dm-threshold"><label><span>重要性阈值</span><input type="range" min="1.5" max="4.5" step="0.1" value="' + state.threshold + '" data-threshold><output data-threshold-output>' + Number(state.threshold).toFixed(1) + '</output></label><p>两个维度分别与阈值比较，落入对应的重要性区域。阈值应由企业批准并保持年度间可解释。</p></div>'
      + '<div class="dm-matrix-wrap" data-matrix-wrap>' + renderMatrix() + '</div>'
      + '<div class="dm-legend"><span><i class="e"></i>环境</span><span><i class="s"></i>社会</span><span><i class="g"></i>治理</span><small>圆点编号对应下方议题顺序</small></div>'
      + '</section>';
  }

  function renderStepTwo() {
    return '<div class="dm-page dm-page--scores"><div class="dm-score-intro"><button type="button" data-action="back-topics">← 返回议题清单</button><p><strong>' + state.selected.length + ' 个议题进入评估</strong><span>建议在评分前明确参与人员、评分尺度和证据要求。</span></p></div>' + renderResults() + renderScoreList()
      + '<section class="dm-method-note"><strong>评分建议</strong><p>影响重要性可从影响规模、范围、不可补救性与发生可能性判断；财务重要性可从风险或机遇的金额、发生可能性和时间范围判断。当前分数是启动值，应由跨部门与利益相关方证据校准。</p></section></div>';
  }

  function render() {
    const root = document.getElementById('materiality-app');
    if (!root) return;
    root.innerHTML = '<div class="dm-shell">' + renderHeader() + renderStepper() + (state.step === 1 ? renderStepOne() : renderStepTwo()) + '<footer class="dm-footer"><span>议题库版本 ' + escapeHtml(library.version) + '</span><p>' + escapeHtml(library.notice) + '</p></footer></div>';
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

  function exportResult() {
    const map = topicMap();
    const payload = {
      exportedAt: new Date().toISOString(),
      companyName: state.companyName,
      industry: library.industries.find(item => item.id === state.industry)?.name || state.industry,
      standards: state.standards.map(id => standardById(id)?.name || id),
      threshold: state.threshold,
      topics: state.selected.map(id => {
        const topic = map.get(id);
        const scores = topic ? ensureScores(topic) : { impact: 3, financial: 3 };
        return topic ? {
          name: displayName(topic), category: CATEGORY_NAMES[topic.category], description: topic.description,
          impactScore: scores.impact, financialScore: scores.financial,
          result: classification(topic).label, evidence: state.notes[id] || '', source: topic.source
        } : null;
      }).filter(Boolean)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (state.companyName || '双重重要性评估') + '_结果.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    if (action === 'export') exportResult();
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
