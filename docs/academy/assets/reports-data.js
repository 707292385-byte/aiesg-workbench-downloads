(function () {
  'use strict';
  const base = new URL('../data/reports/', document.currentScript.src);
  const cached = new Map();
  let manifestPromise;
  async function request(name, format = 'text') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(new URL(name, base), { signal: controller.signal, credentials: 'omit', cache: name === 'manifest.json' ? 'no-cache' : 'default' });
      if (!response.ok) throw new Error('报告文件暂时无法读取');
      return format === 'bytes' ? await response.arrayBuffer() : await response.text();
    } finally { clearTimeout(timer); }
  }
  function manifest() {
    if (!manifestPromise) manifestPromise = request('manifest.json').then(JSON.parse).then(value => {
      if (value.schema !== 1 || !Array.isArray(value.shards) || !value.companies || !Number.isInteger(value.reportCount)) throw new Error('报告索引格式不完整');
      return value;
    }).catch(error => { manifestPromise = null; throw error; });
    return manifestPromise;
  }
  function asset(entry) {
    if (!cached.has(entry.file)) cached.set(entry.file, (async () => {
      let text;
      if (typeof DecompressionStream === 'function') {
        try {
          const bytes = await request(entry.gzip, 'bytes');
          const head = new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 2));
          text = head[0] === 31 && head[1] === 139
            ? await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()
            : new TextDecoder().decode(bytes);
        } catch (_) { text = await request(entry.file); }
      } else text = await request(entry.file);
      if (globalThis.crypto?.subtle) {
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        const actual = Array.from(new Uint8Array(hash), x => x.toString(16).padStart(2, '0')).join('');
        if (actual !== entry.sha256) throw new Error('报告文件校验失败，请重新载入');
      }
      const value = JSON.parse(text);
      if (!Array.isArray(value)) throw new Error('报告文件格式不完整');
      return value;
    })().catch(error => { cached.delete(entry.file); throw error; }));
    return cached.get(entry.file);
  }
  async function load(progress = () => {}) {
    const info = await manifest();
    const [companies, [industries, sources]] = await Promise.all([asset(info.companies), asset(info.dictionaries)]);
    let next = 0, done = 0;
    const pieces = new Array(info.shards.length);
    await Promise.all(Array.from({ length: Math.min(3, info.shards.length) }, async () => {
      while (next < info.shards.length) {
        const index = next++;
        pieces[index] = await asset(info.shards[index]);
        progress(++done, info.shards.length);
      }
    }));
    const reports = pieces.flatMap(rows => rows.map(row => {
      const r = Object.fromEntries(info.fields.map((key, i) => [key, row[i]]));
      if (!companies[r.c] || !industries[r.ind] || sources[r.source] === undefined) throw new Error('报告关联信息不完整');
      r.c = companies[r.c].id;
      r.ind = industries[r.ind];
      r.source = sources[r.source];
      return r;
    }));
    if (companies.length !== info.companyCount || reports.length !== info.reportCount || new Set(reports.map(r => r.id)).size !== reports.length) throw new Error('报告数量核对失败，请重新载入');
    return { ...info, companies, reports };
  }
  window.ReportCatalogue = { manifest, load };
})();
