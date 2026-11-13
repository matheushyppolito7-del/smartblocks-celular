/* Casca instalável do SMARTblocks App (celular e tablet).
   Baixa as telas publicadas no Apps Script (ação baixarApp, a mesma do App do Windows) e fala com o servidor por POST no /exec.
   Os dados ficam só no Apps Script, atrás das mesmas senhas. Guarda o último pacote no aparelho para abrir rápido (e sem internet). */
(function () {
  "use strict";
  const EXEC = "https://script.google.com/macros/s/AKfycbwmXBVCdLblXMVIQu3J5OTO7MrtbE_KGT2szHF8rVkzwoJQN_ILAQPtl9Ijke1j3NvxTw/exec";
  const CHAVE = "smartblocks-crm-2026";
  const qs = new URLSearchParams(location.search);
  const SERVIDOR = qs.get("servidor") || EXEC; // teste local: ?servidor=http://localhost:8765/api
  let canal = qs.get("app") === "nova" ? "nova" : "";
  try { if (qs.has("app")) localStorage.setItem("sb_casca_canal", canal); else canal = localStorage.getItem("sb_casca_canal") || ""; } catch (e) { /* sem armazenamento */ }
  const CACHE = "sb-pacote-" + (canal || "estavel");
  const msg = t => { const p = document.getElementById("casca-msg"); if (p) p.textContent = t; };

  async function api(corpo, ms) {
    const ctl = typeof AbortController === "function" ? new AbortController() : null, t = ctl && ms ? setTimeout(() => ctl.abort(), ms) : 0;
    try {
      // text/plain: pedido "simples", sem consulta prévia (o Apps Script não responde a OPTIONS)
      const r = await fetch(SERVIDOR, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ chave: CHAVE }, canal ? { canal } : {}, corpo)), signal: ctl ? ctl.signal : undefined, redirect: "follow" });
      if (!r.ok) throw new Error("Servidor respondeu " + r.status);
      return await r.json();
    } finally { if (t) clearTimeout(t); }
  }
  async function ungzip(b64) {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const s = new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(s).text();
  }
  async function guardado() {
    try { const c = await caches.open(CACHE), r = await c.match("pacote.json"); return r ? await r.json() : null; } catch (e) { return null; }
  }
  async function guardar(p) {
    try { const c = await caches.open(CACHE); await c.put("pacote.json", new Response(JSON.stringify(p), { headers: { "Content-Type": "application/json" } })); } catch (e) { /* sem cache */ }
  }
  async function pacoteAtual() {
    const velho = await guardado();
    let v = null; try { v = await api({ acao: "versaoApp" }, velho ? 5000 : 20000); } catch (e) { v = null; }
    if (velho && (!v || v.versao === velho.versao)) return velho;           // sem internet ou já é a última
    msg(velho ? "Atualizando o App…" : "Baixando o App (só na primeira vez)…");
    const r = await api({ acao: "baixarApp" }, 60000);
    if (!r || !r.gz) { if (velho) return velho; throw new Error(r && r.erro || "Não deu para baixar o App."); }
    const p = { versao: r.versao, arquivos: JSON.parse(await ungzip(r.gz)).arquivos, baixado_em: new Date().toISOString() };
    await guardar(p); return p;
  }
  // a ponte que o App usa para falar com o servidor (a mesma forma da versão de navegador)
  function ponte(versao) {
    const CFG_K = "sb_config", ler = () => { try { return JSON.parse(localStorage.getItem(CFG_K) || "{}"); } catch (e) { return {}; } };
    window.desktop = {
      web: true, casca: true,
      lerConfig: async () => Object.assign({ servidorUrl: "web", migrado: true }, ler()),
      gravarConfig: async c => { try { localStorage.setItem(CFG_K, JSON.stringify(c)); } catch (e) { /* sem armazenamento */ } return true; },
      escolherPasta: async () => null, lerAndamentos: async () => [], gravarAndamento: async () => true,
      abrir: async url => { window.open(url, "_blank", "noopener"); },
      api: corpo => api(corpo, 120000),
      servidorPadrao: async () => ({ url: "web" }),
      versao: "casca", versaoCompleta: "casca/" + versao,
      pronto: async () => true, aoAtualizar: () => {}, verificarAtualizacao: async () => null,
      aplicarAtualizacao: () => location.reload(),
    };
    window.SB_CHAVE = CHAVE; window.SB_VERSAO = versao; window.SB_CANAL = canal;
  }
  function montar(p) {
    const a = p.arquivos, svg = n => "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(a[n] || "")));
    const trocar = t => String(t || "").split("marca-robo.svg").join(svg("marca-robo.svg")).split("marca-selo.svg").join(svg("marca-selo.svg"));
    const doc = new DOMParser().parseFromString(trocar(a["index.html"]), "text/html");
    // todos os scripts, na ordem da página (os de arquivo e os escritos na página, como o que tira a tela de abertura); o registro do sw.js do App fica de fora
    const scripts = [...doc.querySelectorAll("script")].map(s => s.getAttribute("src") ? { n: s.getAttribute("src") } : { t: s.textContent }).filter(x => x.n ? x.n !== "navegador.js" && a[x.n] != null : !/serviceWorker/.test(x.t));
    doc.querySelectorAll("script").forEach(s => s.remove());
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(l => { const n = l.getAttribute("href"); if (a[n] != null) { const st = doc.createElement("style"); st.textContent = trocar(a[n]); l.replaceWith(st); } });
    doc.querySelectorAll('link[rel="manifest"], link[rel="icon"], link[rel="apple-touch-icon"]').forEach(l => l.remove());
    ponte(p.versao);
    [...doc.documentElement.attributes].forEach(at => document.documentElement.setAttribute(at.name, at.value));
    document.head.querySelectorAll("style").forEach(s => s.remove());
    doc.head.childNodes.forEach(n => { if (!(n.tagName === "META" && /viewport|charset/i.test(n.getAttribute("name") || n.getAttribute("charset") || ""))) document.head.appendChild(document.importNode(n, true)); });
    document.body.innerHTML = doc.body.innerHTML;
    document.documentElement.classList.add("navegador", "casca");
    for (const x of scripts) { const s = document.createElement("script"); s.text = x.n ? trocar(a[x.n]) : x.t; document.body.appendChild(s); }
  }
  async function iniciar() {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
    try { montar(await pacoteAtual()); }
    catch (e) {
      const c = document.getElementById("casca");
      if (c) { msg("Não deu para abrir o App: " + (e && e.message || e) + ". Confira a internet."); const b = document.createElement("button"); b.textContent = "Tentar de novo"; b.onclick = () => location.reload(); c.appendChild(b); }
    }
  }
  iniciar();
})();
