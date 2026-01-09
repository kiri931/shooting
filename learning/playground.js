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

async function loadOptionalJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) return null;
  return await res.json();
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

  const htmlText = document.getElementById("htmlText");
  const cssText = document.getElementById("cssText");
  const jsText = document.getElementById("jsText");

  // 各stepのファイルを読み込んで、エディタに入れる
  try {
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

    htmlText.value = html;
    cssText.value = css;
    jsText.value = js;

    setStatus("読み込み完了。右側を編集して『実行』を押してください。");
  } catch (e) {
    setStatus(
      "読み込みに失敗しました。Live Server等で開いているか確認してください。\n" +
        String(e)
    );
  }

  function run() {
    const outFrame = document.getElementById("outFrame");
    const html = htmlText.value;
    const css = cssText.value;
    const js = jsText.value;

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
  }

  document.getElementById("runBtn").addEventListener("click", run);

  // 初回も実行して表示しておく
  setTimeout(run, 0);
}

main();
