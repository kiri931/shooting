function getStepParam() {
  const url = new URL(window.location.href);
  const step = url.searchParams.get("step") || "step1";

  // 想定外のパスを指定されないように、step1〜step13 のみに制限
  if (!/^step(\d+)$/.test(step)) return "step1";
  const n = Number(step.replace("step", ""));
  if (!Number.isFinite(n) || n < 1 || n > 13) return "step1";
  return step;
}

function setStatus(text) {
  const el = document.getElementById("status");
  el.textContent = text;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripLiveServerInjection(text) {
  // Live Server が .md を HTML 扱いして末尾に注入することがあるため、
  // 目印以降を切り落とす。
  const s = String(text);
  const idx = s.indexOf("<!-- Code injected by live-server -->");
  if (idx >= 0) return s.slice(0, idx).trimEnd();
  return s.trimEnd();
}

function renderInlineMd(text) {
  // インラインコード `...` のみ対応（他はすべてエスケープ済み）
  const escaped = escapeHtml(text);
  return escaped.replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderGuideMarkdown(mdText) {
  const lines = String(mdText).replace(/\r\n?/g, "\n").split("\n");
  let html = "";
  let inList = false;
  let inCode = false;
  let codeBuf = [];

  const closeList = () => {
    if (!inList) return;
    html += "</ul>";
    inList = false;
  };

  const flushCode = () => {
    if (!inCode) return;
    const code = codeBuf.join("\n");
    html += `<pre><code>${escapeHtml(code)}</code></pre>`;
    codeBuf = [];
    inCode = false;
  };

  for (const rawLine of lines) {
    const line = rawLine;

    if (line.trim().startsWith("```")) {
      closeList();
      if (inCode) {
        flushCode();
      } else {
        inCode = true;
        codeBuf = [];
      }
      continue;
    }

    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    const mH = line.match(/^(#{1,3})\s+(.*)$/);
    if (mH) {
      closeList();
      const level = mH[1].length;
      const text = mH[2] ?? "";
      // guide内は h3 相当に寄せる（Playground全体の見出し階層を崩さない）
      html += `<h3>${renderInlineMd(text)}</h3>`;
      continue;
    }

    const mLi = line.match(/^\s*-\s+(.*)$/);
    if (mLi) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${renderInlineMd(mLi[1] ?? "")}</li>`;
      continue;
    }

    if (line.trim() === "") {
      closeList();
      continue;
    }

    closeList();
    html += `<p>${renderInlineMd(line)}</p>`;
  }

  closeList();
  flushCode();
  return html;
}

const STORAGE_PREFIX = "shooting:learning:playground:v1";

function getStepStorageKey(step) {
  return `${STORAGE_PREFIX}:${step}`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatDateTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  if (!Number.isFinite(d.getTime())) return "-";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function loadSavedStep(step) {
  try {
    const raw = localStorage.getItem(getStepStorageKey(step));
    if (!raw) return null;
    const data = safeJsonParse(raw);
    if (!data || typeof data !== "object") return null;
    return {
      html: typeof data.html === "string" ? data.html : "",
      css: typeof data.css === "string" ? data.css : "",
      js: typeof data.js === "string" ? data.js : "",
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : null,
    };
  } catch {
    return null;
  }
}

function saveStep(step, { html, css, js }) {
  const payload = {
    html: String(html ?? ""),
    css: String(css ?? ""),
    js: String(js ?? ""),
    updatedAt: Date.now(),
  };
  localStorage.setItem(getStepStorageKey(step), JSON.stringify(payload));
  return payload.updatedAt;
}

function removeSavedStep(step) {
  try {
    localStorage.removeItem(getStepStorageKey(step));
  } catch {
    // ignore
  }
}

function collectAllSavedSteps() {
  const items = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`${STORAGE_PREFIX}:`)) continue;
      const step = key.slice(`${STORAGE_PREFIX}:`.length);
      if (!/^step\d+$/.test(step)) continue;
      const data = safeJsonParse(localStorage.getItem(key) || "");
      if (!data || typeof data !== "object") continue;
      items[step] = {
        html: typeof data.html === "string" ? data.html : "",
        css: typeof data.css === "string" ? data.css : "",
        js: typeof data.js === "string" ? data.js : "",
        updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : null,
      };
    }
  } catch {
    // ignore
  }
  return items;
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function stripStepExternalRefs(html) {
  // 元の step の index.html にある style.css / main.js を消して、
  // playground の編集内容（textarea）だけが反映されるようにする。
  let out = html;

  // link rel="stylesheet" href="style.css"（./style.css も含む）
  out = out.replace(
    /<link\b[^>]*href\s*=\s*["'](?:\.?\/)?style\.css["'][^>]*>\s*/gi,
    ""
  );

  // script src="main.js"（./main.js も含む）
  out = out.replace(
    /<script\b[^>]*src\s*=\s*["'](?:\.?\/)?main\.js["'][^>]*>\s*<\/script>\s*/gi,
    ""
  );

  return out;
}

function ensureBaseHref(html, baseHref) {
  const baseTag = `<base href="${baseHref}">`;

  // すでに base があるなら追加しない
  if (/<base\b[^>]*>/i.test(html)) return html;

  if (html.includes("</head>")) {
    return html.replace("</head>", `  ${baseTag}\n</head>`);
  }
  return baseTag + "\n" + html;
}

function hasModuleMarkers(jsText) {
  return /\/\/\s*-{3,}\s*file:\s*[^\n]+/i.test(jsText);
}

function splitModules(jsText) {
  // 形式:
  // // --- file: a.js ---
  // ...
  // // --- file: b.js ---
  // ...
  const lines = jsText.split(/\r?\n/);
  const modules = new Map();
  let currentName = null;
  let buf = [];

  const flush = () => {
    if (!currentName) return;
    modules.set(currentName, buf.join("\n") + "\n");
  };

  for (const line of lines) {
    const m = line.match(/^\s*\/\/\s*-{3,}\s*file:\s*([^\s]+)\s*-{3,}\s*$/i);
    if (m) {
      flush();
      currentName = m[1];
      buf = [];
      continue;
    }
    buf.push(line);
  }
  flush();

  return modules;
}

function buildModuleHtml({ step, html, css, modules }) {
  // modules: Map<"./x.js" or "x.js", code>
  // importmap のキーは、main.js 内での import と一致している必要がある。
  // ここでは "./xxx.js" に寄せる。

  const entries = [];
  for (const [name, code] of modules.entries()) {
    const key = name.startsWith("./") ? name : `./${name}`;
    entries.push([key, code]);
  }

  // main.js が無いと実行できない
  const hasMain = entries.some(([k]) => k === "./main.js");
  if (!hasMain) {
    // フォールバック: 何もせず単一スクリプト扱い
    return null;
  }

  // HTMLを整形（外部参照を消して、base href を入れて、CSS を埋め込む）
  let out = stripStepExternalRefs(html);
  out = ensureBaseHref(out, `./${step}/`);

  const styleTag = `\n<style>\n${css}\n</style>\n`;
  if (out.includes("</head>")) {
    out = out.replace("</head>", `${styleTag}</head>`);
  } else {
    out = styleTag + out;
  }

  // 実行部は srcdoc の中で blob module を作る
  // - importmap で ./xxx.js を blob URL に割り当て
  // - type=module で import "./main.js"
  const filesJson = JSON.stringify(Object.fromEntries(entries));
  const runner = `\n<script>\n(() => {\n  const files = ${filesJson};\n  const urls = {};\n  for (const [name, code] of Object.entries(files)) {\n    const blob = new Blob([code], { type: 'text/javascript' });\n    urls[name] = URL.createObjectURL(blob);\n  }\n\n  const importmap = { imports: urls };\n  const mapEl = document.createElement('script');\n  mapEl.type = 'importmap';\n  mapEl.textContent = JSON.stringify(importmap);\n  document.currentScript.after(mapEl);\n\n  const modEl = document.createElement('script');\n  modEl.type = 'module';\n  modEl.textContent = "import './main.js';";\n  mapEl.after(modEl);\n})();\n</script>\n`;

  if (out.includes("</body>")) {
    out = out.replace("</body>", `${runner}</body>`);
  } else {
    out = out + runner;
  }

  return out;
}

function injectCssAndJsIntoHtml({ step, html, css, js }) {
  const styleTag = `\n<style>\n${css}\n</style>\n`;
  const scriptTag = `\n<script>\n${js}\n</script>\n`;

  let out = stripStepExternalRefs(html);
  out = ensureBaseHref(out, `./${step}/`);

  if (out.includes("</head>")) {
    out = out.replace("</head>", `${styleTag}</head>`);
  } else {
    out = styleTag + out;
  }

  if (out.includes("</body>")) {
    out = out.replace("</body>", `${scriptTag}</body>`);
  } else {
    out = out + scriptTag;
  }

  return out;
}

async function loadText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`${path} の読み込みに失敗しました (${res.status})`);
  return await res.text();
}

async function loadOptionalText(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.text();
}

async function loadOptionalJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
}

function setupSampleTabs({ onChange } = {}) {
  // サンプルのソース表示（タブ式）
  const sampleHtmlEl = document.getElementById("sampleHtml");
  const sampleCssEl = document.getElementById("sampleCss");
  const sampleJsEl = document.getElementById("sampleJs");
  const sampleCodeBody = document.getElementById("sampleCodeBody");
  const sampleCodeWrap = document.querySelector(".sampleCode");
  const sampleJsFilesBar = document.getElementById("sampleJsFiles");
  const tabButtons = sampleCodeWrap
    ? Array.from(sampleCodeWrap.querySelectorAll(".tab[data-tab]"))
    : [];

  const setActiveTab = (name) => {
    for (const btn of tabButtons) {
      const active = btn.dataset.tab === name;
      btn.setAttribute("aria-selected", active ? "true" : "false");
    }
    const panes = sampleCodeWrap
      ? Array.from(sampleCodeWrap.querySelectorAll(".codePane[data-pane]"))
      : [];
    for (const pane of panes) {
      pane.hidden = pane.dataset.pane !== name;
    }
    if (sampleCodeBody) sampleCodeBody.hidden = false;

    // JSファイルボタンは、JSタブのときだけ表示（内容は main 側で制御）
    if (sampleJsFilesBar) {
      if (name === "js") {
        // main() から manifest が来ている場合だけ hidden を外す
        // （ここでは onChange に任せる）
      } else {
        sampleJsFilesBar.hidden = true;
      }
    }

    if (typeof onChange === "function") onChange(name);
  };

  for (const btn of tabButtons) {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  }

  // 「コピーできない」対策（選択不可 + copy/cut/contextmenu を抑止）
  if (sampleCodeBody) {
    sampleCodeBody.addEventListener("copy", (e) => e.preventDefault());
    sampleCodeBody.addEventListener("cut", (e) => e.preventDefault());
    sampleCodeBody.addEventListener("contextmenu", (e) => e.preventDefault());
    sampleCodeBody.addEventListener(
      "keydown",
      (e) => {
        const key = String(e.key || "").toLowerCase();
        if ((e.ctrlKey || e.metaKey) && (key === "c" || key === "x" || key === "a")) {
          e.preventDefault();
        }
      },
      true
    );
  }

  return { sampleHtmlEl, sampleCssEl, sampleJsEl, sampleJsFilesBar, setActiveTab };
}

function highlightCode(el) {
  try {
    if (!el || !window.hljs || typeof window.hljs.highlightElement !== "function") return;
    // 再ハイライトできるようにする
    if (el.hasAttribute("data-highlighted")) el.removeAttribute("data-highlighted");
    window.hljs.highlightElement(el);
  } catch {
    // ignore
  }
}

function highlightAllCodeWithin(root) {
  try {
    if (!root) return;
    const codes = root.querySelectorAll("pre code");
    for (const code of codes) highlightCode(code);
  } catch {
    // ignore
  }
}

function setupSampleTabs({ onChange } = {}) {
  // サンプルのソース表示（タブ式）
  const sampleHtmlEl = document.getElementById("sampleHtml");
  const sampleCssEl = document.getElementById("sampleCss");
  const sampleJsEl = document.getElementById("sampleJs");
  const sampleCodeBody = document.getElementById("sampleCodeBody");
  const sampleCodeWrap = document.querySelector(".sampleCode");
  const sampleJsFilesBar = document.getElementById("sampleJsFiles");
  const tabButtons = sampleCodeWrap
    ? Array.from(sampleCodeWrap.querySelectorAll(".tab[data-tab]"))
    : [];

  const setActiveTab = (name) => {
    for (const btn of tabButtons) {
      const active = btn.dataset.tab === name;
      btn.setAttribute("aria-selected", active ? "true" : "false");
    }
    const panes = sampleCodeWrap
      ? Array.from(sampleCodeWrap.querySelectorAll(".codePane[data-pane]"))
      : [];
    for (const pane of panes) {
      pane.hidden = pane.dataset.pane !== name;
    }
    if (sampleCodeBody) sampleCodeBody.hidden = false;

    if (sampleJsFilesBar) {
      if (name !== "js") sampleJsFilesBar.hidden = true;
    }

    if (typeof onChange === "function") onChange(name);
  };

  for (const btn of tabButtons) {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  }

  return { sampleHtmlEl, sampleCssEl, sampleJsEl, sampleJsFilesBar, setActiveTab };
}

function setupMyTabs() {
  // 右側（自分の実行）エディタのタブ
  // opts.onChange(tabName) があれば、タブ切替後に呼ぶ
  const opts = arguments.length > 0 ? arguments[0] : {};
  const myTabsWrap = document.querySelector(".myTabs");
  const myTabButtons = myTabsWrap
    ? Array.from(myTabsWrap.querySelectorAll(".tab[data-my-tab]"))
    : [];
  const myPanes = Array.from(document.querySelectorAll(".myPane[data-my-pane]"));

  const setActiveMyTab = (name) => {
    for (const btn of myTabButtons) {
      const active = btn.dataset.myTab === name;
      btn.setAttribute("aria-selected", active ? "true" : "false");
    }
    for (const pane of myPanes) {
      pane.hidden = pane.dataset.myPane !== name;
    }
  };

  for (const btn of myTabButtons) {
    btn.addEventListener("click", () => {
      const name = btn.dataset.myTab;
      setActiveMyTab(name);
      if (opts && typeof opts.onChange === "function") opts.onChange(name);
    });
  }

  return { setActiveMyTab };
}

function getEffectiveTheme() {
  const v = document.documentElement.dataset.themeEffective;
  return v === "dark" ? "dark" : "light";
}

const CODEMIRROR_VERSION = "5.65.16";
const CODEMIRROR_THEME_STORAGE_KEY = "shooting:learning:codemirrorTheme:v1";
const CODEMIRROR_THEME_FALLBACK_LIGHT = "eclipse";
const CODEMIRROR_THEME_FALLBACK_DARK = "material-darker";
const CODEMIRROR_THEME_ALLOWLIST = new Set([
  "auto",
  "eclipse",
  "idea",
  "neo",
  "material-darker",
  "darcula",
  "dracula",
  "monokai",
]);

function getCodeMirrorThemeCssUrl(name) {
  return `https://cdn.jsdelivr.net/npm/codemirror@${CODEMIRROR_VERSION}/theme/${name}.min.css`;
}

function readCodeMirrorThemePref() {
  try {
    const v = localStorage.getItem(CODEMIRROR_THEME_STORAGE_KEY) || "auto";
    return CODEMIRROR_THEME_ALLOWLIST.has(v) ? v : "auto";
  } catch {
    return "auto";
  }
}

function saveCodeMirrorThemePref(v) {
  try {
    localStorage.setItem(CODEMIRROR_THEME_STORAGE_KEY, v);
  } catch {
    // ignore
  }
}

function resolveCodeMirrorTheme(pref, effectiveTheme) {
  if (pref && pref !== "auto") return pref;
  return effectiveTheme === "dark" ? CODEMIRROR_THEME_FALLBACK_DARK : CODEMIRROR_THEME_FALLBACK_LIGHT;
}

function ensureCodeMirrorThemeCssLoaded(themeName) {
  const link = document.getElementById("cmThemeLink");
  if (!link) return;
  const url = getCodeMirrorThemeCssUrl(themeName);
  if (link.getAttribute("href") !== url) link.setAttribute("href", url);
}

function setupCodeMirrorThemePicker(editors, { onApplied } = {}) {
  const select = document.getElementById("cmThemeSelect");
  if (!select) return;

  const apply = (pref) => {
    const p = CODEMIRROR_THEME_ALLOWLIST.has(pref) ? pref : "auto";
    const effective = getEffectiveTheme();
    const themeName = resolveCodeMirrorTheme(p, effective);
    ensureCodeMirrorThemeCssLoaded(themeName);
    if (editors && typeof editors.setThemeName === "function") editors.setThemeName(themeName);
    if (typeof onApplied === "function") onApplied(p, themeName);
    return p;
  };

  const initialPref = readCodeMirrorThemePref();
  select.value = initialPref;
  let currentPref = apply(initialPref);

  select.addEventListener("change", () => {
    const next = String(select.value || "auto");
    currentPref = apply(next);
    saveCodeMirrorThemePref(currentPref);
  });

  // App theme changed (light/dark): follow only when editor is auto
  const mo = new MutationObserver(() => {
    const p = currentPref || readCodeMirrorThemePref();
    if (p === "auto") apply("auto");
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-effective"] });
}

function syncSampleCodeColorsFromEditor() {
  // サンプルコード表示の色合いを、エディタ（CodeMirror）のテーマに合わせる
  // - CodeMirror が無い場合は CSS 既定（--code-bg/--code-text）のまま
  const sampleWrap = document.querySelector(".sampleCode");
  if (!sampleWrap) return;

  const cm = document.querySelector(".myPane[data-my-pane='js'] .CodeMirror") ||
    document.querySelector(".myPane[data-my-pane='html'] .CodeMirror") ||
    document.querySelector(".myPane[data-my-pane='css'] .CodeMirror");
  if (!cm) return;

  try {
    const cs = window.getComputedStyle(cm);
    const bg = cs.backgroundColor;
    const fg = cs.color;
    if (bg) sampleWrap.style.setProperty("--sample-editor-bg", bg);
    if (fg) sampleWrap.style.setProperty("--sample-editor-text", fg);
  } catch {
    // ignore
  }
}

function setupCodeMirrorEditors({ htmlText, cssText, jsText }) {
  const hasCm = typeof window.CodeMirror === "function";
  if (!hasCm) {
    const getValues = () => ({ html: htmlText.value, css: cssText.value, js: jsText.value });
    const getValue = (which) =>
      which === "html" ? htmlText.value : which === "css" ? cssText.value : which === "js" ? jsText.value : "";
    const setValues = ({ html, css, js }) => {
      htmlText.value = String(html ?? "");
      cssText.value = String(css ?? "");
      jsText.value = String(js ?? "");
    };
    const setValue = (which, value) => {
      const v = String(value ?? "");
      if (which === "html") htmlText.value = v;
      if (which === "css") cssText.value = v;
      if (which === "js") jsText.value = v;
    };
    const onChange = (handler) => {
      htmlText.addEventListener("input", handler);
      cssText.addEventListener("input", handler);
      jsText.addEventListener("input", handler);
    };
    const refresh = () => {};
    return { kind: "textarea", getValues, getValue, setValues, setValue, onChange, refresh };
  }

  const initialPref = readCodeMirrorThemePref();
  const initialThemeName = resolveCodeMirrorTheme(initialPref, getEffectiveTheme());
  ensureCodeMirrorThemeCssLoaded(initialThemeName);
  const baseOptions = {
    lineNumbers: true,
    tabSize: 2,
    indentUnit: 2,
    indentWithTabs: false,
    lineWrapping: true,
    viewportMargin: Infinity,
  };

  const htmlCm = window.CodeMirror.fromTextArea(htmlText, {
    ...baseOptions,
    mode: "htmlmixed",
    theme: initialThemeName,
  });
  const cssCm = window.CodeMirror.fromTextArea(cssText, {
    ...baseOptions,
    mode: "css",
    theme: initialThemeName,
  });
  const jsCm = window.CodeMirror.fromTextArea(jsText, {
    ...baseOptions,
    mode: "javascript",
    theme: initialThemeName,
  });

  const setThemeName = (name) => {
    htmlCm.setOption("theme", name);
    cssCm.setOption("theme", name);
    jsCm.setOption("theme", name);
  };

  const getValues = () => ({ html: htmlCm.getValue(), css: cssCm.getValue(), js: jsCm.getValue() });
  const getValue = (which) =>
    which === "html" ? htmlCm.getValue() : which === "css" ? cssCm.getValue() : which === "js" ? jsCm.getValue() : "";
  const setValues = ({ html, css, js }) => {
    htmlCm.setValue(String(html ?? ""));
    cssCm.setValue(String(css ?? ""));
    jsCm.setValue(String(js ?? ""));
  };
  const setValue = (which, value) => {
    const v = String(value ?? "");
    if (which === "html") htmlCm.setValue(v);
    if (which === "css") cssCm.setValue(v);
    if (which === "js") jsCm.setValue(v);
  };
  const onChange = (handler) => {
    htmlCm.on("change", handler);
    cssCm.on("change", handler);
    jsCm.on("change", handler);
  };
  const refresh = (which) => {
    const target = which === "html" ? htmlCm : which === "css" ? cssCm : which === "js" ? jsCm : null;
    const doOne = (cm) => {
      try {
        cm.refresh();
      } catch {
        // ignore
      }
    };
    if (target) {
      setTimeout(() => doOne(target), 0);
    } else {
      setTimeout(() => {
        doOne(htmlCm);
        doOne(cssCm);
        doOne(jsCm);
      }, 0);
    }
  };

  // initial refresh
  refresh();
  return { kind: "codemirror", getValues, getValue, setValues, setValue, onChange, refresh, setThemeName };
}

function parseCombinedJsToFileMap(jsText, manifestJs) {
  const list = Array.isArray(manifestJs) ? manifestJs.slice() : [];
  const normalizedList = list.map((s) => String(s || "").trim()).filter(Boolean);
  const fallbackName = normalizedList.includes("main.js")
    ? "main.js"
    : normalizedList.length > 0
      ? normalizedList[0]
      : "main.js";

  const map = new Map();
  const text = String(jsText ?? "");
  if (hasModuleMarkers(text)) {
    const parts = splitModules(text);
    for (const [k, v] of parts.entries()) {
      const name = String(k || "").replace(/^\.\//, "");
      map.set(name, String(v ?? ""));
    }
  } else {
    map.set(fallbackName, text);
  }

  for (const name of normalizedList) {
    if (!map.has(name)) map.set(name, "");
  }
  if (!map.has(fallbackName)) map.set(fallbackName, "");
  return { map, fallbackName, normalizedList };
}

function assembleFileMapToCombinedJs(fileMap, manifestJs, fallbackName = "main.js") {
  const list = Array.isArray(manifestJs) ? manifestJs.slice() : [];
  const normalizedList = list.map((s) => String(s || "").trim()).filter(Boolean);
  const order = normalizedList.length > 0 ? normalizedList : [fallbackName];

  const parts = [];
  for (const name of order) {
    const code = String(fileMap.get(name) ?? "").trimEnd();
    parts.push(`// --- file: ${name} ---\n${code}\n`);
  }
  return parts.join("\n");
}

function enableAutoGrowTextarea(textarea) {
  if (!textarea) return () => {};
  textarea.classList.add("autoGrow");

  const getMinHeight = () => {
    try {
      const v = window.getComputedStyle(textarea).minHeight;
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  const resize = () => {
    const minH = getMinHeight();
    textarea.style.height = "auto";
    const next = Math.max(minH, textarea.scrollHeight);
    textarea.style.height = `${next}px`;
  };

  textarea.addEventListener("input", resize);
  window.addEventListener("resize", resize);
  resize();
  return resize;
}

async function setupGuide(step) {
  // ガイド（任意）
  try {
    const guidePath = `./${step}/guide.md`;
    const guide = await loadOptionalText(guidePath);
    const guideWrap = document.getElementById("guide");
    const guideTitle = document.getElementById("guideTitle");
    const guideBody = document.getElementById("guideBody");
    const guideOpen = document.getElementById("guideOpen");

    if (guide) {
      guideWrap.hidden = false;
      guideTitle.textContent = `ガイド: ${step}`;
      const cleaned = stripLiveServerInjection(guide);
      guideBody.innerHTML = renderGuideMarkdown(cleaned);
      highlightAllCodeWithin(guideBody);
      guideOpen.href = guidePath;
    } else {
      guideWrap.hidden = true;
    }
  } catch {
    // ガイド表示は任意機能なので、失敗しても致命的にしない
    const guideWrap = document.getElementById("guide");
    if (guideWrap) guideWrap.hidden = true;
  }
}

function setupPersistence({ step, getValues, setValues, onAnyChange }) {
  // 保存UI
  const saveInfo = document.getElementById("saveInfo");
  const exportBtn = document.getElementById("exportBtn");
  const importFile = document.getElementById("importFile");
  const resetStepBtn = document.getElementById("resetStepBtn");

  const updateSaveInfo = (updatedAt) => {
    if (!saveInfo) return;
    const t = formatDateTime(updatedAt);
    saveInfo.textContent = `自動保存: ${t}`;
  };

  // 自動保存（300ms）
  let saveTimer = null;
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const v = getValues();
        const updatedAt = saveStep(step, {
          html: v.html,
          css: v.css,
          js: v.js,
        });
        updateSaveInfo(updatedAt);
      } catch (e) {
        setStatus("保存に失敗しました（localStorageが使えない可能性があります）。\n" + String(e));
      }
    }, 300);
  };

  if (typeof onAnyChange === "function") {
    onAnyChange(scheduleSave);
  }

  // リセット（このStepのみ）
  if (resetStepBtn) {
    resetStepBtn.addEventListener("click", async () => {
      const m = String(step).match(/^step(\d+)$/);
      const n = m ? Number(m[1]) : 1;
      const prevStep = Number.isFinite(n) && n >= 2 ? `step${n - 1}` : null;

      removeSavedStep(step);

      if (!prevStep) {
        setValues({ html: "", css: "", js: "" });
        updateSaveInfo(null);
        setStatus("このStepの入力をリセットしました。");
        return;
      }

      const prev = loadSavedStep(prevStep);
      if (prev && (prev.html || prev.css || prev.js)) {
        setValues({ html: prev.html, css: prev.css, js: prev.js });
        const updatedAt = saveStep(step, getValues());
        updateSaveInfo(updatedAt);
        setStatus(`${prevStep} の入力を復元しました。`);
        return;
      }

      // 前stepに保存が無い場合は、前stepのサンプルを復元する
      try {
        setStatus(`${prevStep} の内容を読み込んでいます...`);
        const { html, css, js } = await loadStepSources(prevStep);
        const cleanedHtml = stripLiveServerInjection(String(html ?? ""));
        setValues({ html: cleanedHtml, css: String(css ?? ""), js: String(js ?? "") });
        const updatedAt = saveStep(step, getValues());
        updateSaveInfo(updatedAt);
        setStatus(`${prevStep} のサンプルを復元しました。`);
      } catch (e) {
        setValues({ html: "", css: "", js: "" });
        updateSaveInfo(null);
        setStatus("このStepの入力をリセットしました。\n" + String(e));
      }
    });
  }

  // エクスポート（全Step）
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      const all = collectAllSavedSteps();
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const filename = `shooting-learning-playground-${y}${m}${d}.json`;
      downloadJson(filename, {
        version: 1,
        exportedAt: Date.now(),
        items: all,
      });
      setStatus("エクスポートしました（JSONをダウンロードしました）。");
    });
  }

  // インポート（全Step）
  if (importFile) {
    importFile.addEventListener("change", async () => {
      const file = importFile.files && importFile.files[0];
      importFile.value = "";
      if (!file) return;

      try {
        const text = await file.text();
        const data = safeJsonParse(text);
        if (!data || typeof data !== "object") throw new Error("JSONが不正です");
        if (!data.items || typeof data.items !== "object") throw new Error("itemsが見つかりません");

        const items = data.items;
        let importedCount = 0;
        for (const [k, v] of Object.entries(items)) {
          if (!/^step\d+$/.test(k)) continue;
          if (!v || typeof v !== "object") continue;
          const payload = {
            html: typeof v.html === "string" ? v.html : "",
            css: typeof v.css === "string" ? v.css : "",
            js: typeof v.js === "string" ? v.js : "",
            updatedAt: typeof v.updatedAt === "number" ? v.updatedAt : Date.now(),
          };
          localStorage.setItem(getStepStorageKey(k), JSON.stringify(payload));
          importedCount++;
        }

        // 現在のStepを復元
        const restored = loadSavedStep(step);
        if (restored) {
          setValues({ html: restored.html, css: restored.css, js: restored.js });
          updateSaveInfo(restored.updatedAt);
        }

        setStatus(`インポートしました（${importedCount}件）。`);
      } catch (e) {
        setStatus("インポートに失敗しました。\n" + String(e));
      }
    });
  }

  return { updateSaveInfo };
}

async function loadStepSources(step) {
  const manifest = await loadOptionalJson(`./${step}/manifest.json`);

  const htmlPromise = loadText(`./${step}/index.html`);
  const cssPromise = loadText(`./${step}/style.css`);

  let jsPromise;
  if (manifest && Array.isArray(manifest.js) && manifest.js.length > 0) {
    jsPromise = (async () => {
      const parts = [];
      for (const name of manifest.js) {
        const code = await loadText(`./${step}/${name}`);
        parts.push(`// --- file: ${name} ---\n${code.trimEnd()}\n`);
      }
      return parts.join("\n");
    })();
  } else {
    jsPromise = loadText(`./${step}/main.js`);
  }

  const [html, css, js] = await Promise.all([htmlPromise, cssPromise, jsPromise]);
  const manifestJs = manifest && Array.isArray(manifest.js) ? manifest.js.slice() : null;
  return { html, css, js, manifestJs };
}

function setupRunner({ step, htmlText, cssText, jsText, fallbackHtml = "", fallbackCss = "" }) {
  const run = () => {
    const outFrame = document.getElementById("outFrame");
    // 右側は初期状態が空なので、HTML/CSSが空のときは step の素材を土台として使う。
    // （JSだけ書いても実行できるようにする）
    const userHtml = htmlText.value;
    const userCss = cssText.value;
    let js = jsText.value;

    const looksLikeHtml = (s) => /<\s*[a-z!/]/i.test(String(s || ""));
    const looksLikeJs = (s) =>
      /\b(const|let|var|function|class|import|export)\b/.test(String(s || "")) ||
      /\b(document|window|canvas|ctx)\b/.test(String(s || ""));
    const userHtmlTrimmed = String(userHtml || "").trim();
    const jsTrimmed = String(js || "").trim();

    // HTML欄にJS本文を貼ると、そのまま“文章”として表示されてしまう。
    // HTMLとして成立していない（タグらしきものが無い）場合は、step素材を土台にする。
    // ありがちなミス: HTML欄にJSを書いてしまう
    // - JS欄が空で、HTML欄がHTMLっぽくなく、JSっぽいときは「HTML=土台」「JS=HTML欄の内容」として実行する
    if (!jsTrimmed && userHtmlTrimmed && !looksLikeHtml(userHtmlTrimmed) && looksLikeJs(userHtmlTrimmed)) {
      js = userHtml;
    }

    const shouldFallbackHtml =
      !userHtmlTrimmed || (!looksLikeHtml(userHtmlTrimmed) && (String(js || "").trim() || looksLikeJs(userHtmlTrimmed)));

    const html = shouldFallbackHtml ? fallbackHtml : userHtml;
    const css = String(userCss || "").trim() ? userCss : fallbackCss;

    // stepのHTMLは元々 link/script を参照していますが、
    // ここでは“編集した内容”を確実に反映するため、外部参照を消してCSS/JSを埋め込みます。
    // さらに base href を入れて、step内の相対パス（../image など）が動くようにします。
    // 複数ファイル（manifest）を 1つの textarea に入れている場合は、
    // moduleとして実行できるように importmap + blob module を組み立てる。
    const maybeModules = hasModuleMarkers(js) ? splitModules(js) : null;
    const srcdoc =
      maybeModules && maybeModules.size > 0
        ? buildModuleHtml({ step, html, css, modules: maybeModules }) ??
          injectCssAndJsIntoHtml({ step, html, css, js })
        : injectCssAndJsIntoHtml({ step, html, css, js });
    outFrame.srcdoc = srcdoc;
    setStatus("実行しました。");
  };

  document.getElementById("runBtn").addEventListener("click", run);

  // 初回も実行して表示しておく
  setTimeout(run, 0);
}

async function main() {
  const step = getStepParam();

  const titleEl = document.getElementById("pageTitle");
  titleEl.textContent = `Playground: ${step}`;

  const sampleFrame = document.getElementById("sampleFrame");
  const sampleUrl = `./${step}/index.html`;
  sampleFrame.src = sampleUrl;

  const sampleOpen = document.getElementById("sampleOpen");
  sampleOpen.href = sampleUrl;

  // サンプルのソース表示（表示のみ）
  let sampleJsManifestList = null;
  let sampleJsFileMap = null;
  let sampleJsActiveFile = "main.js";
  const renderSampleJsFileButtons = (bar, sampleJsElRef) => {
    if (!bar) return;
    bar.innerHTML = "";
    if (!sampleJsManifestList || sampleJsManifestList.length === 0) {
      bar.hidden = true;
      return;
    }

    for (const name of sampleJsManifestList) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab";
      btn.dataset.sampleJsFile = name;
      btn.setAttribute("role", "tab");
      const active = name === sampleJsActiveFile;
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.textContent = name;
      btn.addEventListener("click", () => {
        if (!sampleJsFileMap) return;
        sampleJsActiveFile = name;
        if (sampleJsElRef) {
          sampleJsElRef.textContent = String(sampleJsFileMap.get(sampleJsActiveFile) ?? "").trimEnd();
        }
        renderSampleJsFileButtons(bar, sampleJsElRef);
      });
      bar.appendChild(btn);
    }
  };

  const { sampleHtmlEl, sampleCssEl, sampleJsEl, sampleJsFilesBar, setActiveTab: setSampleTab } = setupSampleTabs({
    onChange: (name) => {
      if (!sampleJsFilesBar) return;
      if (name !== "js") {
        sampleJsFilesBar.hidden = true;
        return;
      }
      if (!sampleJsManifestList || sampleJsManifestList.length === 0) {
        sampleJsFilesBar.hidden = true;
        return;
      }
      sampleJsFilesBar.hidden = false;
      renderSampleJsFileButtons(sampleJsFilesBar, sampleJsEl);
    },
  });

  // 初期はHTMLタブを表示
  if (typeof setSampleTab === "function") setSampleTab("html");

  const resizeMy = { html: null, css: null, js: null };

  // Step9+ の JS 分割（manifest）対応：JSタブ内でファイル選択できるようにする
  const jsFilesBar = document.getElementById("jsFiles");
  let jsManifestList = null;
  let jsFileMap = null;
  let jsActiveFile = "main.js";
  const setJsFilesVisible = (visible) => {
    if (!jsFilesBar) return;
    if (!jsManifestList || jsManifestList.length === 0) {
      jsFilesBar.hidden = true;
      return;
    }
    jsFilesBar.hidden = !visible;
  };
  const renderJsFileButtons = () => {
    if (!jsFilesBar) return;
    jsFilesBar.innerHTML = "";
    if (!jsManifestList || jsManifestList.length === 0) {
      jsFilesBar.hidden = true;
      return;
    }

    for (const name of jsManifestList) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab";
      btn.dataset.jsFile = name;
      btn.setAttribute("role", "tab");
      const active = name === jsActiveFile;
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.textContent = name;
      btn.addEventListener("click", () => {
        if (!jsFileMap) return;
        // 現在のファイルを保存してから切替
        jsFileMap.set(jsActiveFile, editors.getValue("js"));
        jsActiveFile = name;
        editors.setValue("js", jsFileMap.get(jsActiveFile) ?? "");
        editors.refresh("js");
        renderJsFileButtons();
      });
      jsFilesBar.appendChild(btn);
    }
  };
  const ensureJsFilesFromCombined = (combinedJs) => {
    if (!jsManifestList || jsManifestList.length === 0) return;
    const { map, fallbackName } = parseCombinedJsToFileMap(combinedJs, jsManifestList);
    jsFileMap = map;
    if (!jsManifestList.includes(jsActiveFile)) {
      jsActiveFile = jsManifestList.includes("main.js") ? "main.js" : fallbackName;
    }
    editors.setValue("js", jsFileMap.get(jsActiveFile) ?? "");
    editors.refresh("js");
    renderJsFileButtons();
  };
  const getCombinedJsFromFiles = () => {
    if (!jsManifestList || jsManifestList.length === 0) return editors.getValue("js");
    if (!jsFileMap) {
      ensureJsFilesFromCombined(editors.getValue("js"));
    }
    if (jsFileMap) {
      jsFileMap.set(jsActiveFile, editors.getValue("js"));
      return assembleFileMapToCombinedJs(jsFileMap, jsManifestList, jsActiveFile);
    }
    return editors.getValue("js");
  };

  const { setActiveMyTab } = setupMyTabs({
    onChange: (name) => {
      if (!name) return;
      const fn = resizeMy[name];
      if (typeof fn === "function") fn();

      // JSタブを開いた時点で、manifest があればファイルボタンを出す
      if (name === "js") {
        setJsFilesVisible(true);
        renderJsFileButtons();
      } else {
        setJsFilesVisible(false);
      }
    },
  });
  await setupGuide(step);

  const htmlText = document.getElementById("htmlText");
  const cssText = document.getElementById("cssText");
  const jsText = document.getElementById("jsText");

  const editors = setupCodeMirrorEditors({ htmlText, cssText, jsText });

  // CodeMirror テーマ（公開テーマから選択）
  setupCodeMirrorThemePicker(editors, {
    onApplied: () => {
      // テーマCSSの適用が落ち着いてから同期
      setTimeout(syncSampleCodeColorsFromEditor, 0);
      setTimeout(syncSampleCodeColorsFromEditor, 50);
    },
  });

  // 初回も同期
  setTimeout(syncSampleCodeColorsFromEditor, 0);

  // タブ切替で CodeMirror の表示を確実にする（hidden状態対策）
  const myTabButtons = Array.from(document.querySelectorAll(".myTabs .tab[data-my-tab]"));
  for (const btn of myTabButtons) {
    btn.addEventListener("click", () => {
      const name = btn.dataset.myTab;
      if (editors && typeof editors.refresh === "function") editors.refresh(name);
    });
  }

  const setMyTab = (name) => {
    setActiveMyTab(name);
    if (editors && typeof editors.refresh === "function") editors.refresh(name);
  };

  // 右側は最初にJavaScriptタブを開いておく（中身は空）
  setMyTab("js");

  // 右側が空でも実行できるよう、step素材を fallback として保持
  let fallbackHtml = "";
  let fallbackCss = "";

  // 各stepのファイルを読み込んで、エディタに入れる
  try {
    const { html, css, js, manifestJs } = await loadStepSources(step);

    // 左側（サンプル）にはソースを表示する（Live Server 注入は除去）
    if (sampleHtmlEl) sampleHtmlEl.textContent = stripLiveServerInjection(html);
    if (sampleCssEl) sampleCssEl.textContent = String(css ?? "").trimEnd();

    if (Array.isArray(manifestJs) && manifestJs.length > 0) {
      sampleJsManifestList = manifestJs.map((s) => String(s || "").trim()).filter(Boolean);
      const parsed = parseCombinedJsToFileMap(js, sampleJsManifestList);
      sampleJsFileMap = parsed.map;
      sampleJsActiveFile = sampleJsManifestList.includes("main.js") ? "main.js" : parsed.fallbackName;
      if (sampleJsEl) sampleJsEl.textContent = String(sampleJsFileMap.get(sampleJsActiveFile) ?? "").trimEnd();
      if (sampleJsFilesBar) {
        // JSタブを開いた時に出るが、開いている場合に備えて生成しておく
        renderSampleJsFileButtons(sampleJsFilesBar, sampleJsEl);
      }
    } else {
      sampleJsManifestList = null;
      sampleJsFileMap = null;
      if (sampleJsFilesBar) sampleJsFilesBar.hidden = true;
      if (sampleJsEl) sampleJsEl.textContent = String(js ?? "").trimEnd();
    }

    // Step9+ の manifest を保持
    jsManifestList = Array.isArray(manifestJs) ? manifestJs.map((s) => String(s || "").trim()).filter(Boolean) : null;
    if (jsManifestList && jsManifestList.length > 0) {
      jsActiveFile = jsManifestList.includes("main.js") ? "main.js" : jsManifestList[0];
      setJsFilesVisible(true);
      renderJsFileButtons();
    } else {
      jsManifestList = null;
      jsFileMap = null;
      setJsFilesVisible(false);
    }

    // iframe(srcdoc) の土台として使う分は、Live Server の注入が混ざる場合に備えて除去しておく
    fallbackHtml = stripLiveServerInjection(html);
    fallbackCss = String(css ?? "");

    // 右側（自分の実行）は基本は空。保存データがあれば復元する。
    const wrappedEditors = {
      ...editors,
      getValues: () => {
        const v = editors.getValues();
        if (jsManifestList && jsManifestList.length > 0) {
          return { ...v, js: getCombinedJsFromFiles() };
        }
        return v;
      },
      setValues: ({ html, css, js }) => {
        editors.setValue("html", String(html ?? ""));
        editors.setValue("css", String(css ?? ""));
        if (jsManifestList && jsManifestList.length > 0) {
          ensureJsFilesFromCombined(String(js ?? ""));
        } else {
          editors.setValue("js", String(js ?? ""));
        }
      },
      onChange: (handler) => {
        editors.onChange(() => {
          // js編集中は Map へ反映してから handler を呼ぶ
          if (jsManifestList && jsManifestList.length > 0) {
            if (!jsFileMap) ensureJsFilesFromCombined(editors.getValue("js"));
            if (jsFileMap) jsFileMap.set(jsActiveFile, editors.getValue("js"));
          }
          handler();
        });
      },
    };

    const { updateSaveInfo } = setupPersistence({
      step,
      getValues: wrappedEditors.getValues,
      setValues: wrappedEditors.setValues,
      onAnyChange: wrappedEditors.onChange,
    });

    const restored = loadSavedStep(step);
    if (restored) {
      wrappedEditors.setValues({ html: restored.html, css: restored.css, js: restored.js });
      updateSaveInfo(restored.updatedAt);
      editors.refresh();
      setStatus("読み込み完了。保存済みの入力を復元しました。");
    } else {
      // step2以降は、前のstepの入力を初期値として引き継ぐ
      const m = String(step).match(/^step(\d+)$/);
      const n = m ? Number(m[1]) : 1;
      const prevStep = Number.isFinite(n) && n >= 2 ? `step${n - 1}` : null;
      const prev = prevStep ? loadSavedStep(prevStep) : null;
      if (prev && (prev.html || prev.css || prev.js)) {
        wrappedEditors.setValues({ html: prev.html, css: prev.css, js: prev.js });
        // 引き継いだ状態も、このStepとして保存しておく（次回以降も同じ状態で開ける）
        const updatedAt = saveStep(step, wrappedEditors.getValues());
        updateSaveInfo(updatedAt);
        editors.refresh();
        setStatus(`読み込み完了。${prevStep} の入力を引き継ぎました。`);
      } else {
        wrappedEditors.setValues({ html: "", css: "", js: "" });
        updateSaveInfo(null);
        editors.refresh();
        setStatus("読み込み完了。右側は空の状態です。まずは自分で書いて『実行』してください。");
      }
    }
  } catch (e) {
    setStatus(
      "読み込みに失敗しました。Live Server等で開いているか確認してください。\n" +
        String(e)
    );
  }

  // runner は textarea.value を読むので、常に CodeMirror -> textarea を同期してから実行する
  // CodeMirror.fromTextArea は内部で textarea を隠すが、値同期は明示しておく。
  const getValuesForRun = () => editors.getValues();
  const syncToTextareas = () => {
    const v = jsManifestList && jsManifestList.length > 0
      ? { ...getValuesForRun(), js: getCombinedJsFromFiles() }
      : getValuesForRun();
    htmlText.value = v.html;
    cssText.value = v.css;
    jsText.value = v.js;
  };

  document.getElementById("runBtn").addEventListener("click", () => {
    syncToTextareas();
  });

  // 初回実行も同期してから
  syncToTextareas();
  setupRunner({ step, htmlText, cssText, jsText, fallbackHtml, fallbackCss });
}

main();
