document.addEventListener("DOMContentLoaded", function () {
    const card = document.getElementById("cardCategorias");
 
    if (!card) return;
 
    /* =====================================
       ELEMENTOS
    ===================================== */
 
    const lista = document.getElementById("listaCategorias");
    const mensagemVazia = document.getElementById("mensagemSemCategorias");
    const dica = document.getElementById("dicaModo");
    const aviso = document.getElementById("avisoCategorias");
 
    const btnAdicionar = document.getElementById("btn-abrir-modal");
    const btnModoEditar = document.getElementById("btnModoEditar");
    const btnModoExcluir = document.getElementById("btnModoExcluir");
    const textoBtnEditar = document.getElementById("textoBtnEditar");
    const textoBtnExcluir = document.getElementById("textoBtnExcluir");
 
    // Modal de adicionar / editar
    const modalCategoria = document.getElementById("modalCategoria");
    const tituloModal = document.getElementById("tituloModalCategoria");
    const subtituloModal = document.getElementById("subtituloModalCategoria");
    const formCategoria = document.getElementById("formCategoria");
    const inputNome = document.getElementById("nomeCategoria");
    const contadorNome = document.getElementById("contadorNomeCategoria");
    const gradeIcones = document.getElementById("gradeIcones");
    const erroCategoria = document.getElementById("erroCategoria");
    const btnSalvar = document.getElementById("btnSalvarCategoria");
    const btnCancelar = document.getElementById("btnCancelarCategoria");
    const btnFecharModal = document.getElementById("btnFecharModalCategoria");
 
    // Modal de exclusão
    const modalExcluir = document.getElementById("modalExcluirCategoria");
    const textoExcluir = document.getElementById("textoModalExcluir");
    const listaExclusao = document.getElementById("listaExclusao");
    const erroExclusao = document.getElementById("erroExclusao");
    const btnConfirmarExclusao = document.getElementById("btnConfirmarExclusao");
    const btnCancelarExclusao = document.getElementById("btnCancelarExclusao");
    const btnFecharExcluir = document.getElementById("btnFecharModalExcluir");
 
    /* =====================================
       CONFIGURAÇÕES E ESTADO
    ===================================== */
 
    const URL_CADASTRAR = card.dataset.urlCadastrar;
    const URL_EDITAR = card.dataset.urlEditar; // contém ".../0/..." no lugar do id
    const URL_EXCLUIR = card.dataset.urlExcluir;
 
    const MAX_NOME = 40;
    const ICONE_PADRAO = "shirt";
 
    // Mesma lista permitida no Flask (categorias_rotas.py)
    const ICONES = [
        { valor: "shirt", rotulo: "Roupas" },
        { valor: "person-dress", rotulo: "Feminino" },
        { valor: "person", rotulo: "Masculino" },
        { valor: "child", rotulo: "Infantil" },
        { valor: "shoe-prints", rotulo: "Calçados" },
        { valor: "bag-shopping", rotulo: "Bolsas" },
        { valor: "gem", rotulo: "Joias" },
        { valor: "glasses", rotulo: "Óculos" },
        { valor: "mobile-screen", rotulo: "Celulares" },
        { valor: "laptop", rotulo: "Eletrônicos" },
        { valor: "headphones", rotulo: "Acessórios" },
        { valor: "couch", rotulo: "Casa" },
        { valor: "utensils", rotulo: "Cozinha" },
        { valor: "dumbbell", rotulo: "Esporte" },
        { valor: "tag", rotulo: "Outros" }
    ];
 
    // [{ idCategoria, nome, icone }]
    let categorias = lerCategoriasIniciais();
 
    // null, "editar" ou "excluir"
    let modo = null;
 
    // Ids marcados no modo excluir
    const selecionadas = new Set();
 
    // Categoria aberta no modal (null = criando uma nova)
    let categoriaEmEdicao = null;
 
    let temporizadorAviso = null;
    let elementoAntesDoModal = null;
 
    /* =====================================
       FUNÇÕES AUXILIARES
    ===================================== */
 
    function lerCategoriasIniciais() {
        try {
            const dados = JSON.parse(
                document.getElementById("dadosCategorias").textContent
            );
 
            return Array.isArray(dados) ? dados : [];
        } catch (erro) {
            return [];
        }
    }
 
    // Ignora maiúsculas, acentos e espaços repetidos
    function normalizar(texto) {
        return String(texto)
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }
 
    function limparEspacos(texto) {
        return String(texto).replace(/\s+/g, " ").trim();
    }
 
    function criarElemento(tag, classe, texto) {
        const elemento = document.createElement(tag);
 
        if (classe) elemento.className = classe;
        if (texto !== undefined) elemento.textContent = texto;
 
        return elemento;
    }
 
    function iconeValido(icone) {
        return ICONES.some(function (item) {
            return item.valor === icone;
        })
            ? icone
            : ICONE_PADRAO;
    }
 
    function criarIcone(icone, estilo) {
        const i = document.createElement("i");
        i.className = (estilo || "fa-solid") + " fa-" + iconeValido(icone);
        i.setAttribute("aria-hidden", "true");
        return i;
    }
 
    function mostrarErro(elemento, mensagem) {
        elemento.textContent = mensagem;
        elemento.hidden = false;
    }
 
    function limparErro(elemento) {
        elemento.textContent = "";
        elemento.hidden = true;
    }
 
    function mostrarAviso(mensagem, erro) {
        clearTimeout(temporizadorAviso);
 
        aviso.textContent = mensagem;
        aviso.classList.toggle("erro", Boolean(erro));
        aviso.hidden = false;
 
        temporizadorAviso = setTimeout(function () {
            aviso.hidden = true;
        }, 3500);
    }
 
    // Envia JSON para o Flask e devolve a resposta já convertida
    async function enviar(url, corpo) {
        let resposta;
 
        try {
            resposta = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(corpo)
            });
        } catch (erro) {
            throw new Error("Não foi possível conectar ao servidor.");
        }
 
        let dados = {};
 
        try {
            dados = await resposta.json();
        } catch (erro) {
            // resposta sem JSON
        }
 
        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível concluir a operação."
            );
        }
 
        return dados;
    }
 
    function urlDaCategoria(id) {
        return URL_EDITAR.replace("/0/", "/" + encodeURIComponent(id) + "/");
    }
 
    /* =====================================
       MOSTRAR AS CATEGORIAS
    ===================================== */
 
    function criarCartao(categoria) {
        const item = criarElemento("li", "item-categoria");
 
        const cartao = criarElemento("div", "cartao-categoria");
        cartao.dataset.id = categoria.idCategoria;
 
        if (selecionadas.has(String(categoria.idCategoria))) {
            cartao.classList.add("selecionado");
        }
 
        // Corpo: ícone + nome
        const corpo = criarElemento("button", "cartao-corpo");
        corpo.type = "button";
        corpo.title = categoria.nome;
 
        corpo.append(
            criarIcone(categoria.icone),
            criarElemento("span", "nome-categoria", categoria.nome)
        );
 
        corpo.addEventListener("click", function () {
            aoClicarNoCartao(categoria);
        });
 
        // Ações no canto: lápis e lixeira
        const acoes = criarElemento("div", "acoes-cartao");
 
        const btnEditar = criarElemento("button", "btn-mini");
        btnEditar.type = "button";
        btnEditar.setAttribute("aria-label", "Editar categoria " + categoria.nome);
        btnEditar.title = "Editar";
 
        const iconeLapis = document.createElement("i");
        iconeLapis.className = "fa-solid fa-pencil";
        iconeLapis.setAttribute("aria-hidden", "true");
        btnEditar.appendChild(iconeLapis);
 
        btnEditar.addEventListener("click", function () {
            abrirModalCategoria(categoria);
        });
 
        const btnExcluir = criarElemento("button", "btn-mini perigo");
        btnExcluir.type = "button";
        btnExcluir.setAttribute("aria-label", "Excluir categoria " + categoria.nome);
        btnExcluir.title = "Excluir";
 
        const iconeLixeira = document.createElement("i");
        iconeLixeira.className = "fa-regular fa-trash-can";
        iconeLixeira.setAttribute("aria-hidden", "true");
        btnExcluir.appendChild(iconeLixeira);
 
        btnExcluir.addEventListener("click", function () {
            abrirConfirmacao([categoria]);
        });
 
        acoes.append(btnEditar, btnExcluir);
        cartao.append(corpo, acoes);
        item.appendChild(cartao);
 
        return item;
    }
 
    function renderizar() {
        lista.replaceChildren();
 
        categorias.forEach(function (categoria) {
            lista.appendChild(criarCartao(categoria));
        });
 
        const vazio = categorias.length === 0;
 
        mensagemVazia.hidden = !vazio;
        btnModoEditar.disabled = vazio;
        btnModoExcluir.disabled = vazio;
 
        atualizarBotoesDeModo();
    }
 
    /* =====================================
       MODOS: EDITAR E EXCLUIR
    ===================================== */
 
    function definirModo(novoModo) {
        modo = modo === novoModo ? null : novoModo;
 
        selecionadas.clear();
 
        card.classList.toggle("modo-editar", modo === "editar");
        card.classList.toggle("modo-excluir", modo === "excluir");
 
        renderizar();
    }
 
    function atualizarBotoesDeModo() {
        btnModoEditar.setAttribute("aria-pressed", String(modo === "editar"));
        btnModoExcluir.setAttribute("aria-pressed", String(modo === "excluir"));
 
        textoBtnEditar.textContent = modo === "editar" ? "Concluir" : "Editar";
 
        if (modo === "excluir") {
            textoBtnExcluir.textContent = selecionadas.size > 0
                ? "Excluir (" + selecionadas.size + ")"
                : "Cancelar";
        } else {
            textoBtnExcluir.textContent = "Excluir";
        }
 
        if (modo === "editar") {
            dica.textContent = "Clique em uma categoria para editar o nome ou o ícone.";
            dica.hidden = false;
        } else if (modo === "excluir") {
            dica.textContent = "Selecione as categorias que deseja excluir.";
            dica.hidden = false;
        } else {
            dica.hidden = true;
        }
    }
 
    function aoClicarNoCartao(categoria) {
        if (modo === "editar") {
            abrirModalCategoria(categoria);
            return;
        }
 
        if (modo === "excluir") {
            const id = String(categoria.idCategoria);
 
            if (selecionadas.has(id)) {
                selecionadas.delete(id);
            } else {
                selecionadas.add(id);
            }
 
            renderizar();
        }
    }
 
    btnModoEditar.addEventListener("click", function () {
        definirModo("editar");
    });
 
    btnModoExcluir.addEventListener("click", function () {
        if (modo !== "excluir") {
            definirModo("excluir");
            return;
        }
 
        if (selecionadas.size === 0) {
            definirModo(null);
            return;
        }
 
        abrirConfirmacao(
            categorias.filter(function (categoria) {
                return selecionadas.has(String(categoria.idCategoria));
            })
        );
    });
 
    /* =====================================
       CONTROLE DOS MODAIS
    ===================================== */
 
    function abrirJanela(janela) {
        elementoAntesDoModal = document.activeElement;
 
        janela.hidden = false;
        document.body.style.overflow = "hidden";
    }
 
    function fecharJanela(janela) {
        janela.hidden = true;
 
        if (modalCategoria.hidden && modalExcluir.hidden) {
            document.body.style.overflow = "";
        }
 
        if (elementoAntesDoModal && elementoAntesDoModal.isConnected) {
            elementoAntesDoModal.focus();
        }
    }
 
    [modalCategoria, modalExcluir].forEach(function (janela) {
        janela.addEventListener("mousedown", function (event) {
            if (event.target === janela) {
                fecharJanela(janela);
            }
        });
    });
 
    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
 
        if (!modalExcluir.hidden) {
            fecharJanela(modalExcluir);
        } else if (!modalCategoria.hidden) {
            fecharJanela(modalCategoria);
        } else if (modo) {
            definirModo(modo);
        }
    });
 
    /* =====================================
       MODAL: ADICIONAR / EDITAR
    ===================================== */
 
    function montarGradeDeIcones() {
        gradeIcones.replaceChildren();
 
        ICONES.forEach(function (icone) {
            const rotulo = criarElemento("label", "opcao-icone");
            rotulo.title = icone.rotulo;
 
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.name = "iconeCategoria";
            radio.value = icone.valor;
            radio.setAttribute("aria-label", icone.rotulo);
 
            const caixa = document.createElement("span");
            caixa.appendChild(criarIcone(icone.valor));
 
            rotulo.append(radio, caixa);
            gradeIcones.appendChild(rotulo);
        });
    }
 
    function iconeSelecionado() {
        const marcado = gradeIcones.querySelector("input:checked");
 
        return marcado ? marcado.value : ICONE_PADRAO;
    }
 
    function marcarIcone(valor) {
        const alvo = iconeValido(valor);
 
        gradeIcones.querySelectorAll("input").forEach(function (radio) {
            radio.checked = radio.value === alvo;
        });
    }
 
    function atualizarContador() {
        contadorNome.textContent = inputNome.value.length + "/" + MAX_NOME;
    }
 
    function abrirModalCategoria(categoria) {
        categoriaEmEdicao = categoria || null;
 
        limparErro(erroCategoria);
 
        if (categoriaEmEdicao) {
            tituloModal.textContent = "Editar Categoria";
            subtituloModal.textContent = "Editar categoria";
            inputNome.value = categoriaEmEdicao.nome;
            marcarIcone(categoriaEmEdicao.icone);
        } else {
            tituloModal.textContent = "Adicionar Categoria";
            subtituloModal.textContent = "Nova categoria";
            inputNome.value = "";
            marcarIcone(ICONE_PADRAO);
        }
 
        atualizarContador();
        abrirJanela(modalCategoria);
 
        inputNome.focus();
        inputNome.select();
    }
 
    btnAdicionar.addEventListener("click", function () {
        abrirModalCategoria(null);
    });
 
    btnCancelar.addEventListener("click", function () {
        fecharJanela(modalCategoria);
    });
 
    btnFecharModal.addEventListener("click", function () {
        fecharJanela(modalCategoria);
    });
 
    inputNome.addEventListener("input", function () {
        limparErro(erroCategoria);
        atualizarContador();
    });
 
    gradeIcones.addEventListener("change", function () {
        limparErro(erroCategoria);
    });
 
    function validarNome(nome) {
        if (!nome) {
            return "Informe o nome da categoria.";
        }
 
        if (nome.length > MAX_NOME) {
            return "O nome pode ter no máximo " + MAX_NOME + " caracteres.";
        }
 
        const repetida = categorias.some(function (categoria) {
            const mesma = categoriaEmEdicao &&
                String(categoria.idCategoria) === String(categoriaEmEdicao.idCategoria);
 
            return !mesma && normalizar(categoria.nome) === normalizar(nome);
        });
 
        if (repetida) {
            return "Já existe uma categoria com esse nome.";
        }
 
        return "";
    }
 
    formCategoria.addEventListener("submit", async function (event) {
        event.preventDefault();
 
        limparErro(erroCategoria);
 
        const nome = limparEspacos(inputNome.value);
        const icone = iconeSelecionado();
        const mensagem = validarNome(nome);
 
        if (mensagem) {
            mostrarErro(erroCategoria, mensagem);
            inputNome.focus();
            return;
        }
 
        btnSalvar.disabled = true;
 
        try {
            if (categoriaEmEdicao) {
                const dados = await enviar(
                    urlDaCategoria(categoriaEmEdicao.idCategoria),
                    { nome: nome, icone: icone }
                );
 
                const indice = categorias.findIndex(function (categoria) {
                    return String(categoria.idCategoria) ===
                        String(categoriaEmEdicao.idCategoria);
                });
 
                if (indice >= 0) {
                    categorias[indice] = dados.categoria;
                }
 
                mostrarAviso("Categoria atualizada.");
            } else {
                const dados = await enviar(
                    URL_CADASTRAR,
                    { nome: nome, icone: icone }
                );
 
                categorias.push(dados.categoria);
 
                mostrarAviso("Categoria criada.");
            }
 
            fecharJanela(modalCategoria);
            renderizar();
        } catch (erro) {
            mostrarErro(erroCategoria, erro.message);
        } finally {
            btnSalvar.disabled = false;
        }
    });
 
    /* =====================================
       MODAL: CONFIRMAR EXCLUSÃO
    ===================================== */
 
    let categoriasParaExcluir = [];
 
    function abrirConfirmacao(alvos) {
        if (alvos.length === 0) return;
 
        categoriasParaExcluir = alvos;
 
        limparErro(erroExclusao);
 
        textoExcluir.textContent = alvos.length === 1
            ? "A categoria abaixo será excluída. Essa ação não pode ser desfeita."
            : "As " + alvos.length + " categorias abaixo serão excluídas. " +
              "Essa ação não pode ser desfeita.";
 
        listaExclusao.replaceChildren();
 
        alvos.forEach(function (categoria) {
            listaExclusao.appendChild(criarElemento("li", "", categoria.nome));
        });
 
        abrirJanela(modalExcluir);
        btnCancelarExclusao.focus();
    }
 
    btnCancelarExclusao.addEventListener("click", function () {
        fecharJanela(modalExcluir);
    });
 
    btnFecharExcluir.addEventListener("click", function () {
        fecharJanela(modalExcluir);
    });
 
    btnConfirmarExclusao.addEventListener("click", async function () {
        limparErro(erroExclusao);
 
        btnConfirmarExclusao.disabled = true;
 
        const ids = categoriasParaExcluir.map(function (categoria) {
            return categoria.idCategoria;
        });
 
        try {
            await enviar(URL_EXCLUIR, { ids: ids });
 
            const removidos = new Set(ids.map(String));
 
            categorias = categorias.filter(function (categoria) {
                return !removidos.has(String(categoria.idCategoria));
            });
 
            selecionadas.clear();
 
            mostrarAviso(
                ids.length === 1
                    ? "Categoria excluída."
                    : ids.length + " categorias excluídas."
            );
 
            fecharJanela(modalExcluir);
 
            // Sem nada para excluir, sai do modo de exclusão
            if (categorias.length === 0) {
                modo = null;
                card.classList.remove("modo-editar", "modo-excluir");
            }
 
            renderizar();
        } catch (erro) {
            mostrarErro(erroExclusao, erro.message);
        } finally {
            btnConfirmarExclusao.disabled = false;
        }
    });
 
    /* =====================================
       INICIALIZAÇÃO
    ===================================== */
 
    montarGradeDeIcones();
    renderizar();
});
 