(() => {
  "use strict";
 
  const API = "/api/personalizacao";
  const TAMANHO_MAX = 5 * 1024 * 1024; // 5 MB (igual ao limite do Flask)
  const TIPOS = ["image/jpeg", "image/png"];
 
  const raiz = document.documentElement;
  const status = document.getElementById("status");
  const btnSalvar = document.getElementById("btnSalvar");
  const inputsCor = document.querySelectorAll('input[data-chave][data-var]');
 
  // Arquivos escolhidos e ainda não enviados
  const arquivos = { logo: null, banner: null };
 
  /* ---------------- Mensagens ---------------- */
  function mostrarStatus(texto, erro = false) {
    status.textContent = texto;
    status.classList.toggle("erro", erro);
  }
 
  /* ---------------- Sanfona ---------------- */
  document.querySelectorAll(".sanfona-topo").forEach((botao) => {
    botao.addEventListener("click", () => {
      const secao = botao.closest(".sanfona");
      const aberta = secao.classList.toggle("aberta");
      botao.setAttribute("aria-expanded", aberta);
    });
  });
 
  /* ================= Conversões de cor ================= */
  // INICIO-CONVERSOES
  function hexParaRgb(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbParaHex({ r, g, b }) {
    return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function rgbParaHsv({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return { h, s: max ? d / max : 0, v: max };
  }
  function hsvParaRgb({ h, s, v }) {
    const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  }
  // FIM-CONVERSOES
  const limitar = (n, min, max) => Math.min(max, Math.max(min, n));
 
  /* ================= Seletor de cor RGB ================= */
  function aplicarCor(input) {
    const valor = input.value.toUpperCase();
    raiz.style.setProperty(input.dataset.var, valor);
    const item = input.parentElement;
    const rotulo = item.querySelector("code");
    if (rotulo) rotulo.textContent = valor;
    const amostra = item.querySelector(".cor-amostra");
    if (amostra) amostra.style.background = valor;
  }
 
  function criarSeletor() {
    const el = document.createElement("div");
    el.className = "seletor";
    el.hidden = true;
    el.tabIndex = -1;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Seletor de cor");
    el.innerHTML = `
      <div class="seletor-sv" tabindex="0" role="application"
           aria-label="Saturação e brilho. Use as setas do teclado.">
        <div class="seletor-ponto"></div>
      </div>
      <input type="range" class="deslizante s-matiz" min="0" max="360" step="1" value="0" aria-label="Matiz">
      <div class="seletor-canal"><span>R</span><input type="range" class="deslizante s-r" min="0" max="255" aria-label="Vermelho"><output class="o-r"></output></div>
      <div class="seletor-canal"><span>G</span><input type="range" class="deslizante s-g" min="0" max="255" aria-label="Verde"><output class="o-g"></output></div>
      <div class="seletor-canal"><span>B</span><input type="range" class="deslizante s-b" min="0" max="255" aria-label="Azul"><output class="o-b"></output></div>
      <div class="seletor-rodape">
        <label>Hex <input type="text" class="s-hex" maxlength="7" spellcheck="false" autocomplete="off"></label>
        <button type="button" class="s-ok btn-personalizar">Concluir</button>
      </div>`;
    document.body.appendChild(el);
 
    const q = (s) => el.querySelector(s);
    const areaSV = q(".seletor-sv"), ponto = q(".seletor-ponto");
    const matiz = q(".s-matiz"), hexCampo = q(".s-hex");
    const canais = {
      r: { slider: q(".s-r"), saida: q(".o-r") },
      g: { slider: q(".s-g"), saida: q(".o-g") },
      b: { slider: q(".s-b"), saida: q(".o-b") },
    };
 
    let input = null, botao = null;
    let rgb = { r: 0, g: 0, b: 0 };
    let hsv = { h: 0, s: 0, v: 0 };
 
    // fonte = quem mudou: "hsv" (área/matiz) ou "rgb" (sliders/hex)
    function atualizar(fonte, digitandoHex = false) {
      if (fonte === "hsv") rgb = hsvParaRgb(hsv);
      else {
        const novo = rgbParaHsv(rgb);
        if (novo.s === 0 || novo.v === 0) novo.h = hsv.h; // não perde o matiz em cinza/preto
        if (novo.v === 0) novo.s = hsv.s;
        hsv = novo;
      }
      const hex = rgbParaHex(rgb);
 
      areaSV.style.backgroundColor = `hsl(${hsv.h}, 100%, 50%)`;
      ponto.style.left = hsv.s * 100 + "%";
      ponto.style.top = (1 - hsv.v) * 100 + "%";
      matiz.value = Math.round(hsv.h);
 
      const { r, g, b } = rgb;
      canais.r.slider.value = r; canais.r.saida.textContent = r;
      canais.g.slider.value = g; canais.g.saida.textContent = g;
      canais.b.slider.value = b; canais.b.saida.textContent = b;
      canais.r.slider.style.background = `linear-gradient(to right, rgb(0,${g},${b}), rgb(255,${g},${b}))`;
      canais.g.slider.style.background = `linear-gradient(to right, rgb(${r},0,${b}), rgb(${r},255,${b}))`;
      canais.b.slider.style.background = `linear-gradient(to right, rgb(${r},${g},0), rgb(${r},${g},255))`;
      if (!digitandoHex) hexCampo.value = hex;
 
      if (input) { input.value = hex; aplicarCor(input); } // pré-visualiza ao vivo
    }
 
    // Área de saturação/brilho: segurar e arrastar o mouse
    function moverNaArea(e) {
      const r = areaSV.getBoundingClientRect();
      hsv.s = limitar((e.clientX - r.left) / r.width, 0, 1);
      hsv.v = 1 - limitar((e.clientY - r.top) / r.height, 0, 1);
      atualizar("hsv");
    }
    areaSV.addEventListener("pointerdown", (e) => {
      areaSV.setPointerCapture(e.pointerId);
      moverNaArea(e);
    });
    areaSV.addEventListener("pointermove", (e) => {
      if (areaSV.hasPointerCapture(e.pointerId)) moverNaArea(e);
    });
    areaSV.addEventListener("keydown", (e) => {
      const passo = (e.shiftKey ? 0.1 : 0.02);
      const mapa = { ArrowLeft: ["s", -passo], ArrowRight: ["s", passo], ArrowUp: ["v", passo], ArrowDown: ["v", -passo] };
      if (!mapa[e.key]) return;
      e.preventDefault();
      const [campo, delta] = mapa[e.key];
      hsv[campo] = limitar(hsv[campo] + delta, 0, 1);
      atualizar("hsv");
    });
 
    matiz.addEventListener("input", () => { hsv.h = Number(matiz.value); atualizar("hsv"); });
 
    Object.entries(canais).forEach(([chave, { slider }]) => {
      slider.addEventListener("input", () => { rgb = { ...rgb, [chave]: Number(slider.value) }; atualizar("rgb"); });
    });
 
    hexCampo.addEventListener("input", () => {
      const txt = hexCampo.value.trim();
      if (/^#?[0-9a-f]{6}$/i.test(txt)) {
        rgb = hexParaRgb(txt.startsWith("#") ? txt : "#" + txt);
        atualizar("rgb", true);
      }
    });
    hexCampo.addEventListener("blur", () => { hexCampo.value = rgbParaHex(rgb); });
 
    function posicionar() {
      if (!botao) return;
      const r = botao.getBoundingClientRect();
      const w = el.offsetWidth, h = el.offsetHeight;
      const esquerda = limitar(r.right - w, 8, window.innerWidth - w - 8);
      let topo = r.bottom + 8;
      if (topo + h > window.innerHeight - 8 && r.top - h - 8 > 8) topo = r.top - h - 8;
      el.style.left = esquerda + window.scrollX + "px";
      el.style.top = topo + window.scrollY + "px";
    }
 
    function abrir(novoInput, novoBotao) {
      if (botao) botao.setAttribute("aria-expanded", "false");
      input = null; // evita aplicar enquanto carrega o valor inicial
      botao = novoBotao;
      rgb = hexParaRgb(novoInput.value);
      hsv = rgbParaHsv(rgb);
      atualizar("rgb");
      input = novoInput;
      botao.setAttribute("aria-expanded", "true");
      el.hidden = false;
      posicionar();
      el.focus({ preventScroll: true });
    }
 
    function fechar(devolverFoco = true) {
      if (el.hidden) return;
      el.hidden = true;
      if (botao) {
        botao.setAttribute("aria-expanded", "false");
        if (devolverFoco) botao.focus({ preventScroll: true });
      }
      input = null; botao = null;
    }
 
    q(".s-ok").addEventListener("click", () => fechar());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fechar(); });
    document.addEventListener("pointerdown", (e) => {
      if (!el.hidden && !el.contains(e.target) && !(botao && botao.contains(e.target))) fechar(false);
    });
    window.addEventListener("resize", posicionar);
 
    return { abrir, fechar, aberto: () => !el.hidden, botaoAtual: () => botao };
  }
 
  const seletor = criarSeletor();
 
  // Troca cada <input type="color"> por uma amostra que abre o seletor
  inputsCor.forEach((input) => {
    const nomeEl = input.closest(".cor-item")?.querySelector(".cor-nome");
    const nome = nomeEl ? nomeEl.childNodes[0].textContent.trim() : "cor";
 
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "cor-amostra";
    botao.setAttribute("aria-label", `Escolher ${nome}`);
    botao.setAttribute("aria-haspopup", "dialog");
    botao.setAttribute("aria-expanded", "false");
 
    input.type = "hidden"; // o input só guarda o valor; quem escolhe é o seletor
    input.before(botao);
 
    botao.addEventListener("click", () => {
      if (seletor.aberto() && seletor.botaoAtual() === botao) seletor.fechar();
      else seletor.abrir(input, botao);
    });
 
    aplicarCor(input);
  });
 
  /* ---------------- Upload de imagens ---------------- */
  function configurarUpload(campo, idInput, idPreview, idDrop) {
    const input = document.getElementById(idInput);
    const preview = document.getElementById(idPreview);
    const zona = document.getElementById(idDrop);
 
    function receber(arquivo) {
      if (!arquivo) return;
      if (!TIPOS.includes(arquivo.type)) {
        mostrarStatus("Formato inválido. Use JPEG ou PNG.", true);
        return;
      }
      if (arquivo.size > TAMANHO_MAX) {
        mostrarStatus("A imagem passa de 5 MB. Escolha um arquivo menor.", true);
        return;
      }
      arquivos[campo] = arquivo;
      mostrarImagem(campo, URL.createObjectURL(arquivo));
      mostrarStatus("");
    }
 
    input.addEventListener("change", () => receber(input.files[0]));
 
    ["dragenter", "dragover"].forEach((ev) =>
      zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.add("arrastando"); })
    );
    ["dragleave", "drop"].forEach((ev) =>
      zona.addEventListener(ev, (e) => { e.preventDefault(); zona.classList.remove("arrastando"); })
    );
    zona.addEventListener("drop", (e) => receber(e.dataTransfer.files[0]));
 
    return preview;
  }
 
  const previews = {
    logo: configurarUpload("logo", "inputLogo", "previewLogo", "dropLogo"),
    banner: configurarUpload("banner", "inputBanner", "previewBanner", "dropBanner"),
  };
 
  function mostrarImagem(campo, url) {
    const preview = previews[campo];
    preview.src = url;
    preview.hidden = false;
    preview.parentElement.querySelectorAll(".dz-texto, .dz-formatos").forEach((el) => (el.hidden = true));
    if (campo === "logo") {
      // Atualiza a logo do menu lateral (base.html) na hora
      const menu = document.getElementById("logo-menu");
      if (menu) { menu.src = url; menu.hidden = false; }
      const nome = document.getElementById("nome-menu");
      if (nome) nome.hidden = true;
    }
  }
 
  /* ---------------- Carregar do servidor ---------------- */
  async function carregar() {
    try {
      const resp = await fetch(API);
      if (!resp.ok) throw new Error();
      const config = await resp.json();
 
      inputsCor.forEach((input) => {
        const salvo = config.cores?.[input.dataset.chave];
        if (salvo) input.value = salvo;
        aplicarCor(input);
      });
      if (config.logo) mostrarImagem("logo", config.logo);
      if (config.banner) mostrarImagem("banner", config.banner);
    } catch {
      mostrarStatus("Não foi possível carregar suas configurações. Veja o terminal do Flask.", true);
    }
  }
 
  /* ---------------- Salvar ---------------- */
  btnSalvar.addEventListener("click", async () => {
    const cores = {};
    inputsCor.forEach((i) => (cores[i.dataset.chave] = i.value.toUpperCase()));
 
    const dados = new FormData();
    dados.append("cores", JSON.stringify(cores));
    if (arquivos.logo) dados.append("logo", arquivos.logo);
    if (arquivos.banner) dados.append("banner", arquivos.banner);
 
    btnSalvar.disabled = true;
    mostrarStatus("Salvando...");
    try {
      const resp = await fetch(API, { method: "POST", body: dados });
      let corpo = {};
      try { corpo = await resp.json(); } catch { /* o servidor não respondeu em JSON */ }
      if (!resp.ok) throw new Error(corpo.erro || "Erro no servidor. Veja a mensagem no terminal do Flask.");
      arquivos.logo = arquivos.banner = null;
      mostrarStatus("Alterações salvas.");
    } catch (e) {
      mostrarStatus(e.message || "Não foi possível salvar. Tente novamente.", true);
    } finally {
      btnSalvar.disabled = false;
    }
  });
 
  carregar();
})();
 