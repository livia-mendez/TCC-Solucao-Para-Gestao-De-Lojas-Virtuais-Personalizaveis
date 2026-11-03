document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("modalProduto");
 
    if (!modal) return;
 
    /* =====================================
       ELEMENTOS
    ===================================== */
 
    const modalConteudo = modal.querySelector(".modal-produto");
    const form = document.getElementById("formProduto");
 
    const btnAbrir = document.getElementById("btnAbrirModal");
    const btnFechar = document.getElementById("btnFecharModal");
    const btnVoltar = document.getElementById("btnVoltar");
    const btnProximo = document.getElementById("btnProximo");
    const btnSalvar = document.getElementById("btnSalvar");
 
    const nomeProduto = document.getElementById("nome");
    const checkboxVariacoes = document.getElementById("possuiVariacoes");
    const campoValor = document.getElementById("campoValor");
    const campoEstoque = document.getElementById("campoEstoque");
    const valorBase = document.getElementById("valorBase");
    const estoque = document.getElementById("estoque");
 
    const etapas = [
        document.getElementById("etapa1"),
        document.getElementById("etapa2"),
        document.getElementById("etapa3")
    ];
 
    const indicador = document.getElementById("etapaAtual");
 
    // Etapa 2
    const avisoSemVariacoes = document.getElementById("avisoSemVariacoes");
    const conteudoVariacoes = document.getElementById("conteudoVariacoes");
    const erroEtapa2 = document.getElementById("erroEtapa2");
 
    const cabecalhoVariacoes = document.getElementById("cabecalhoVariacoes");
    const listaVariacoes = document.getElementById("listaVariacoes");
    const btnAdicionarVariacao = document.getElementById("btnAdicionarVariacao");
    const btnGerarVariacoes = document.getElementById("btnGerarVariacoes");
 
    const btnNovoAtributo = document.getElementById("btnNovoAtributo");
    const formAtributo = document.getElementById("formAtributo");
    const btnAdicionarAtributo = document.getElementById("btnAdicionarAtributo");
    const btnCancelarAtributo = document.getElementById("btnCancelarAtributo");
 
    const nomeAtributo = document.getElementById("nomeAtributo");
    const opcoesAtributo = document.getElementById("opcoesAtributo");
    const listaAtributos = document.getElementById("listaAtributos");
    const mensagemAtributos = document.getElementById("mensagemAtributos");
 
    const atributosJson = document.getElementById("atributosJson");
    const variacoesJson = document.getElementById("variacoesJson");
 
    // Etapa 3
    const btnCancelar = document.getElementById("btnCancelar");
 
    const selectVariacaoImagem = document.getElementById("selecionarVariacaoImagem");
    const selectCorFundo = document.getElementById("corFundoImagem");
    const amostraVariacao = document.getElementById("amostraVariacao");
    const amostraFundo = document.getElementById("amostraFundo");
 
    const areaUpload = document.getElementById("areaUpload");
    const entradaImagens = document.getElementById("entradaImagens");
    const contadorImagens = document.getElementById("contadorImagens");
    const mensagemImagens = document.getElementById("mensagemImagens");
    const listaImagens = document.getElementById("listaImagens");
    const erroImagens = document.getElementById("erroImagens");
 
    // Campos enviados ao Flask
    const imagensProduto = document.getElementById("imagensProduto");
    const imagensJson = document.getElementById("imagensJson");
 
    /* =====================================
       ESTADO
    ===================================== */
 
    const MAX_COMBINACOES = 100;
    const MAX_IMAGENS = 8;
    const MAX_TAMANHO_IMAGEM = 5 * 1024 * 1024; // 5 MB
    const TIPOS_IMAGEM = ["image/png", "image/jpeg", "image/webp"];
 
    let indiceEtapa = 0;
 
    // [{ nome: "Cor", opcoes: ["Azul", "Rosa"] }]
    const atributos = [];
 
    // [{ valores: { Cor: "Azul", Tamanho: "M" }, preco: 3999 (centavos), estoque: 10 }]
    const variacoes = [];
 
    // Imagens: { id, arquivo, url, grupo: "geral" ou "v<idVariacao>", principal }
    let imagens = [];
    let proximoIdImagem = 1;
 
    // Cada variação ganha um id fixo (as imagens apontam para ele)
    let proximoIdVariacao = 1;
 
    // Grupo exibido na etapa 3 e cor de fundo escolhida por grupo
    let grupoAtual = "geral";
    const coresDeFundo = {};
 
    /* =====================================
       FUNÇÕES AUXILIARES
    ===================================== */
 
    const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
 
    function formatarMoeda(centavos) {
        return formatadorMoeda
            .format(centavos / 100)
            .replace(/\u00A0/g, " ");
    }
 
    function centavosDe(texto) {
        const digitos = String(texto).replace(/\D/g, "").slice(0, 9);
        return digitos ? parseInt(digitos, 10) : 0;
    }
 
    // Máscara de moeda: digita-se apenas números (ex.: 3999 -> R$ 39,99)
    function aplicarMascara(input) {
        const centavos = centavosDe(input.value);
        input.value = centavos > 0 ? formatarMoeda(centavos) : "";
        return centavos;
    }
 
    function mostrarErro(elemento, mensagem) {
        elemento.textContent = mensagem;
        elemento.hidden = false;
    }
 
    function limparErro(elemento) {
        elemento.textContent = "";
        elemento.hidden = true;
    }
 
    /* =====================================
       ABRIR E FECHAR O MODAL
    ===================================== */
 
    function abrirModal() {
        modal.classList.add("ativo");
        document.body.style.overflow = "hidden";
        nomeProduto.focus();
    }
 
    function fecharModal() {
        modal.classList.remove("ativo");
        document.body.style.overflow = "";
    }
 
    btnAbrir?.addEventListener("click", abrirModal);
    btnFechar?.addEventListener("click", fecharModal);
 
    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            fecharModal();
        }
    });
 
    document.addEventListener("keydown", function (event) {
        if (
            event.key === "Escape" &&
            modal.classList.contains("ativo")
        ) {
            fecharModal();
        }
    });
 
    /* =====================================
       MOSTRAR A ETAPA ATUAL
    ===================================== */
 
    function mostrarEtapa(indice) {
        indiceEtapa = indice;
 
        etapas.forEach(function (etapa, i) {
            etapa.hidden = i !== indice;
            etapa.classList.toggle("ativa", i === indice);
        });
 
        btnVoltar.hidden = indice === 0;
        btnProximo.hidden = indice === 2;
        btnSalvar.hidden = indice !== 2;
        btnCancelar.hidden = indice !== 2;
 
        const posicoes = ["0%", "50%", "100%"];
        indicador.style.left = posicoes[indice];
 
        limparErro(erroEtapa2);
        limparErro(erroImagens);
 
        if (indice === 2) {
            prepararEtapaImagens();
        }
 
        modalConteudo.scrollTop = 0;
    }
 
    /* =====================================
       PRODUTO COM OU SEM VARIAÇÕES
    ===================================== */
 
    function atualizarModoProduto() {
        const possuiVariacoes = checkboxVariacoes.checked;
 
        // Com variações, valor e estoque passam a ser definidos em cada variação
        campoValor.hidden = possuiVariacoes;
        campoEstoque.hidden = possuiVariacoes;
 
        valorBase.required = !possuiVariacoes;
        estoque.required = !possuiVariacoes;
 
        if (possuiVariacoes) {
            valorBase.value = "";
            valorBase.setCustomValidity("");
            estoque.value = "0";
        }
 
        // Etapa 2: mostra o editor ou apenas um aviso
        conteudoVariacoes.hidden = !possuiVariacoes;
        avisoSemVariacoes.hidden = possuiVariacoes;
    }
 
    checkboxVariacoes.addEventListener("change", atualizarModoProduto);
 
    // Máscara do Valor Base
    valorBase.addEventListener("input", function () {
        valorBase.setCustomValidity("");
        aplicarMascara(valorBase);
    });
 
    /* =====================================
       VALIDAR A PRIMEIRA ETAPA
    ===================================== */
 
    function validarEtapaInicial() {
        valorBase.setCustomValidity("");
 
        const campos = etapas[0].querySelectorAll(
            "input, select, textarea"
        );
 
        for (const campo of campos) {
            if (
                campo.disabled ||
                campo.type === "checkbox" ||
                !campo.required
            ) {
                continue;
            }
 
            if (!campo.checkValidity()) {
                campo.reportValidity();
                campo.focus();
                return false;
            }
        }
 
        if (!checkboxVariacoes.checked && centavosDe(valorBase.value) <= 0) {
            valorBase.setCustomValidity("Informe um valor maior que zero.");
            valorBase.reportValidity();
            valorBase.focus();
            return false;
        }
 
        return true;
    }
 
    /* =====================================
       VALIDAR A SEGUNDA ETAPA
    ===================================== */
 
    function chaveDaVariacao(variacao) {
        return atributos
            .map(function (atributo) {
                return variacao.valores[atributo.nome];
            })
            .join("\u0001");
    }
 
    function validarEtapaVariacoes() {
        limparErro(erroEtapa2);
 
        // Produto sem variações não precisa de atributos
        if (!checkboxVariacoes.checked) return true;
 
        if (atributos.length === 0) {
            mostrarErro(erroEtapa2, "Adicione pelo menos um atributo para continuar.");
            return false;
        }
 
        if (variacoes.length === 0) {
            mostrarErro(
                erroEtapa2,
                "Adicione pelo menos uma variação (ou gere todas as combinações)."
            );
            return false;
        }
 
        if (variacoes.some(function (v) { return v.preco <= 0; })) {
            mostrarErro(erroEtapa2, "Informe o preço de todas as variações.");
            return false;
        }
 
        const chaves = new Set();
 
        for (const variacao of variacoes) {
            const chave = chaveDaVariacao(variacao);
 
            if (chaves.has(chave)) {
                mostrarErro(
                    erroEtapa2,
                    "Existem variações repetidas. Altere ou exclua as duplicadas."
                );
                return false;
            }
 
            chaves.add(chave);
        }
 
        return true;
    }
 
    /* =====================================
       NAVEGAR ENTRE AS ETAPAS
    ===================================== */
 
    btnProximo.addEventListener("click", function () {
        if (indiceEtapa === 0) {
            if (!validarEtapaInicial()) return;
 
            // Sempre exibe a etapa 2.
            mostrarEtapa(1);
            return;
        }
 
        if (indiceEtapa === 1) {
            if (!validarEtapaVariacoes()) return;
 
            mostrarEtapa(2);
        }
    });
 
    btnVoltar.addEventListener("click", function () {
        if (indiceEtapa > 0) {
            mostrarEtapa(indiceEtapa - 1);
        }
    });
 
    /* =====================================
       ABRIR E FECHAR O FORMULÁRIO DE ATRIBUTO
    ===================================== */
 
    btnNovoAtributo.addEventListener("click", function () {
        formAtributo.hidden = false;
        nomeAtributo.focus();
    });
 
    btnCancelarAtributo.addEventListener("click", function () {
        formAtributo.hidden = true;
        nomeAtributo.value = "";
        opcoesAtributo.value = "";
    });
 
    /* =====================================
       ADICIONAR UM ATRIBUTO
    ===================================== */
 
    function adicionarAtributo() {
        limparErro(erroEtapa2);
 
        const nome = nomeAtributo.value.trim();
 
        const opcoes = opcoesAtributo.value
            .split(",")
            .map(function (opcao) {
                return opcao.trim();
            })
            .filter(Boolean);
 
        if (!nome) {
            mostrarErro(erroEtapa2, "Informe o nome do atributo.");
            nomeAtributo.focus();
            return;
        }
 
        if (opcoes.length === 0) {
            mostrarErro(erroEtapa2, "Informe pelo menos uma opção para o atributo.");
            opcoesAtributo.focus();
            return;
        }
 
        const duplicado = atributos.some(function (atributo) {
            return atributo.nome.toLowerCase() === nome.toLowerCase();
        });
 
        if (duplicado) {
            mostrarErro(erroEtapa2, "Esse atributo já foi cadastrado.");
            nomeAtributo.focus();
            return;
        }
 
        // Remove opções repetidas ignorando maiúsculas/minúsculas
        const vistas = new Set();
        const opcoesUnicas = opcoes.filter(function (opcao) {
            const chave = opcao.toLowerCase();
            if (vistas.has(chave)) return false;
            vistas.add(chave);
            return true;
        });
 
        atributos.push({ nome: nome, opcoes: opcoesUnicas });
 
        // Variações já existentes recebem a primeira opção do novo atributo
        variacoes.forEach(function (variacao) {
            variacao.valores[nome] = opcoesUnicas[0];
        });
 
        atualizarListaAtributos();
        renderizarVariacoes();
 
        nomeAtributo.value = "";
        opcoesAtributo.value = "";
        formAtributo.hidden = true;
    }
 
    btnAdicionarAtributo.addEventListener("click", adicionarAtributo);
 
    // Enter nos campos do atributo adiciona (e não envia o formulário)
    [nomeAtributo, opcoesAtributo].forEach(function (campo) {
        campo.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                adicionarAtributo();
            }
        });
    });
 
    /* =====================================
       ATUALIZAR A LISTA DE ATRIBUTOS
    ===================================== */
 
    function atualizarListaAtributos() {
        listaAtributos
            .querySelectorAll(".item-atributo")
            .forEach(function (item) {
                item.remove();
            });
 
        mensagemAtributos.hidden = atributos.length > 0;
 
        atributos.forEach(function (atributo, indice) {
            const item = document.createElement("div");
            item.className = "item-atributo";
 
            const cabecalho = document.createElement("div");
            cabecalho.className = "cabecalho-atributo";
 
            const nomeElemento = document.createElement("span");
            nomeElemento.className = "nome-atributo";
 
            const icone = document.createElement("i");
            icone.className = "fas fa-cog";
            icone.setAttribute("aria-hidden", "true");
 
            const titulo = document.createElement("strong");
            titulo.textContent = atributo.nome;
 
            nomeElemento.append(icone, titulo);
 
            const btnExcluir = document.createElement("button");
            btnExcluir.type = "button";
            btnExcluir.className = "btn-remover-atributo";
            btnExcluir.setAttribute(
                "aria-label",
                "Excluir atributo " + atributo.nome
            );
 
            const iconeExcluir = document.createElement("i");
            iconeExcluir.className = "fas fa-trash";
            iconeExcluir.setAttribute("aria-hidden", "true");
            btnExcluir.appendChild(iconeExcluir);
 
            btnExcluir.addEventListener("click", function () {
                limparErro(erroEtapa2);
 
                const removido = atributos.splice(indice, 1)[0];
 
                variacoes.forEach(function (variacao) {
                    delete variacao.valores[removido.nome];
                });
 
                atualizarListaAtributos();
                renderizarVariacoes();
            });
 
            cabecalho.append(nomeElemento, btnExcluir);
 
            const opcoesElemento = document.createElement("div");
            opcoesElemento.className = "opcoes-atributo";
 
            atributo.opcoes.forEach(function (opcao) {
                const etiqueta = document.createElement("span");
                etiqueta.className = "opcao-atributo";
                etiqueta.textContent = opcao;
 
                opcoesElemento.appendChild(etiqueta);
            });
 
            item.append(cabecalho, opcoesElemento);
            listaAtributos.appendChild(item);
        });
    }
 
    /* =====================================
       TABELA DE VARIAÇÕES
    ===================================== */
 
    function criarCabecalho(texto) {
        const th = document.createElement("th");
        th.textContent = texto;
        return th;
    }
 
    function criarCelula(conteudo) {
        const td = document.createElement("td");
        td.appendChild(conteudo);
        return td;
    }
 
    function renderizarVariacoes() {
        cabecalhoVariacoes.replaceChildren();
        listaVariacoes.replaceChildren();
 
        // Colunas: um atributo por coluna + Preço + Estoque + Excluir
        atributos.forEach(function (atributo) {
            cabecalhoVariacoes.appendChild(criarCabecalho(atributo.nome));
        });
 
        cabecalhoVariacoes.append(
            criarCabecalho("Preço"),
            criarCabecalho("Estoque"),
            criarCabecalho("Excluir")
        );
 
        btnAdicionarVariacao.disabled = atributos.length === 0;
        btnGerarVariacoes.disabled = atributos.length === 0;
 
        // Mensagem quando não há linhas
        if (atributos.length === 0 || variacoes.length === 0) {
            const linha = document.createElement("tr");
            linha.id = "mensagemVariacoes";
 
            const celula = document.createElement("td");
            celula.colSpan = atributos.length + 3;
            celula.textContent = atributos.length === 0
                ? "Adicione atributos para configurar as variações."
                : "Nenhuma variação. Adicione uma ou gere todas as combinações.";
 
            linha.appendChild(celula);
            listaVariacoes.appendChild(linha);
            return;
        }
 
        variacoes.forEach(function (variacao, indice) {
            const linha = document.createElement("tr");
 
            // Um select por atributo
            atributos.forEach(function (atributo) {
                const select = document.createElement("select");
                select.setAttribute(
                    "aria-label",
                    atributo.nome + " da variação " + (indice + 1)
                );
 
                atributo.opcoes.forEach(function (opcao) {
                    const option = document.createElement("option");
                    option.value = opcao;
                    option.textContent = opcao;
                    select.appendChild(option);
                });
 
                select.value = variacao.valores[atributo.nome];
 
                select.addEventListener("change", function () {
                    variacao.valores[atributo.nome] = select.value;
                    limparErro(erroEtapa2);
                });
 
                linha.appendChild(criarCelula(select));
            });
 
            // Preço
            const inputPreco = document.createElement("input");
            inputPreco.type = "text";
            inputPreco.className = "input-preco-variacao";
            inputPreco.placeholder = "R$ 0,00";
            inputPreco.inputMode = "numeric";
            inputPreco.autocomplete = "off";
            inputPreco.setAttribute("aria-label", "Preço da variação " + (indice + 1));
            inputPreco.value = variacao.preco > 0 ? formatarMoeda(variacao.preco) : "";
 
            inputPreco.addEventListener("input", function () {
                variacao.preco = aplicarMascara(inputPreco);
                limparErro(erroEtapa2);
            });
 
            linha.appendChild(criarCelula(inputPreco));
 
            // Estoque com + e -
            const controle = document.createElement("div");
            controle.className = "controle-estoque";
 
            const inputEstoque = document.createElement("input");
            inputEstoque.type = "number";
            inputEstoque.min = "0";
            inputEstoque.step = "1";
            inputEstoque.value = String(variacao.estoque);
            inputEstoque.setAttribute("aria-label", "Estoque da variação " + (indice + 1));
 
            function definirEstoque(valor) {
                variacao.estoque = Math.max(0, parseInt(valor, 10) || 0);
                inputEstoque.value = String(variacao.estoque);
            }
 
            inputEstoque.addEventListener("input", function () {
                variacao.estoque = Math.max(0, parseInt(inputEstoque.value, 10) || 0);
            });
 
            inputEstoque.addEventListener("blur", function () {
                definirEstoque(inputEstoque.value);
            });
 
            const btnMais = document.createElement("button");
            btnMais.type = "button";
            btnMais.className = "btn-estoque";
            btnMais.textContent = "+";
            btnMais.setAttribute("aria-label", "Aumentar estoque");
            btnMais.addEventListener("click", function () {
                definirEstoque(variacao.estoque + 1);
            });
 
            const btnMenos = document.createElement("button");
            btnMenos.type = "button";
            btnMenos.className = "btn-estoque";
            btnMenos.textContent = "-";
            btnMenos.setAttribute("aria-label", "Diminuir estoque");
            btnMenos.addEventListener("click", function () {
                definirEstoque(variacao.estoque - 1);
            });
 
            controle.append(inputEstoque, btnMais, btnMenos);
            linha.appendChild(criarCelula(controle));
 
            // Excluir
            const btnExcluir = document.createElement("button");
            btnExcluir.type = "button";
            btnExcluir.className = "btn-excluir-variacao";
            btnExcluir.setAttribute("aria-label", "Excluir variação " + (indice + 1));
 
            const iconeExcluir = document.createElement("i");
            iconeExcluir.className = "fas fa-trash";
            iconeExcluir.setAttribute("aria-hidden", "true");
            btnExcluir.appendChild(iconeExcluir);
 
            btnExcluir.addEventListener("click", function () {
                variacoes.splice(indice, 1);
                limparErro(erroEtapa2);
                renderizarVariacoes();
            });
 
            linha.appendChild(criarCelula(btnExcluir));
 
            listaVariacoes.appendChild(linha);
        });
    }
 
    /* =====================================
       ADICIONAR VARIAÇÕES
    ===================================== */
 
    function totalDeCombinacoes() {
        return atributos.reduce(function (total, atributo) {
            return total * atributo.opcoes.length;
        }, 1);
    }
 
    // Produto cartesiano de todas as opções dos atributos
    function gerarCombinacoes() {
        let resultado = [{}];
 
        atributos.forEach(function (atributo) {
            const novo = [];
 
            resultado.forEach(function (combinacao) {
                atributo.opcoes.forEach(function (opcao) {
                    const copia = Object.assign({}, combinacao);
                    copia[atributo.nome] = opcao;
                    novo.push(copia);
                });
            });
 
            resultado = novo;
        });
 
        return resultado;
    }
 
    function chavesExistentes() {
        return new Set(variacoes.map(chaveDaVariacao));
    }
 
    btnAdicionarVariacao.addEventListener("click", function () {
        limparErro(erroEtapa2);
 
        if (atributos.length === 0) return;
 
        let valores;
 
        if (totalDeCombinacoes() <= MAX_COMBINACOES) {
            // Sugere a primeira combinação que ainda não foi usada
            const existentes = chavesExistentes();
 
            valores = gerarCombinacoes().find(function (combinacao) {
                return !existentes.has(chaveDaVariacao({ valores: combinacao }));
            });
 
            if (!valores) {
                mostrarErro(
                    erroEtapa2,
                    "Todas as combinações possíveis já foram adicionadas."
                );
                return;
            }
        } else {
            valores = {};
            atributos.forEach(function (atributo) {
                valores[atributo.nome] = atributo.opcoes[0];
            });
        }
 
        variacoes.push({
            id: proximoIdVariacao++,
            valores: valores,
            preco: 0,
            estoque: 0
        });
        renderizarVariacoes();
    });
 
    btnGerarVariacoes.addEventListener("click", function () {
        limparErro(erroEtapa2);
 
        if (atributos.length === 0) return;
 
        if (totalDeCombinacoes() > MAX_COMBINACOES) {
            mostrarErro(
                erroEtapa2,
                "São combinações demais (máximo de " + MAX_COMBINACOES +
                "). Reduza as opções ou adicione as variações manualmente."
            );
            return;
        }
 
        const existentes = chavesExistentes();
        let novas = 0;
 
        gerarCombinacoes().forEach(function (combinacao) {
            if (existentes.has(chaveDaVariacao({ valores: combinacao }))) return;
 
            variacoes.push({
                id: proximoIdVariacao++,
                valores: combinacao,
                preco: 0,
                estoque: 0
            });
            novas++;
        });
 
        if (novas === 0) {
            mostrarErro(erroEtapa2, "Todas as combinações já foram adicionadas.");
        }
 
        renderizarVariacoes();
    });
 
    /* =====================================
       IMAGENS (GERAIS OU POR VARIAÇÃO)
    ===================================== */
 
    // Nomes de cores comuns, para mostrar a amostra ao lado da variação
    const CORES_CONHECIDAS = {
        vermelho: "#e11d2e", vermelha: "#e11d2e",
        azul: "#2563eb",
        rosa: "#ec4899",
        preto: "#111111", preta: "#111111",
        branco: "#ffffff", branca: "#ffffff",
        verde: "#16a34a",
        amarelo: "#facc15", amarela: "#facc15",
        laranja: "#f97316",
        roxo: "#7c3aed", roxa: "#7c3aed",
        lilas: "#c084fc",
        cinza: "#9ca3af",
        marrom: "#92400e",
        bege: "#e7d3b5",
        dourado: "#d4af37", dourada: "#d4af37",
        prata: "#c0c0c0",
        vinho: "#7f1d1d"
    };
 
    function semAcento(texto) {
        return String(texto)
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .trim();
    }
 
    function corDaVariacao(variacao) {
        for (const nome of Object.keys(variacao.valores)) {
            const cor = CORES_CONHECIDAS[semAcento(variacao.valores[nome])];
 
            if (cor) return cor;
        }
 
        return null;
    }
 
    function rotuloDaVariacao(variacao) {
        return atributos
            .map(function (atributo) {
                return variacao.valores[atributo.nome];
            })
            .join(" / ");
    }
 
    function grupoDaVariacao(variacao) {
        return "v" + variacao.id;
    }
 
    // Sem a opção "possui variações", só existe o grupo geral
    function variacoesAtivas() {
        return checkboxVariacoes.checked ? variacoes : [];
    }
 
    function imagensDoGrupo(grupo) {
        return imagens.filter(function (imagem) {
            return imagem.grupo === grupo;
        });
    }
 
    // A imagem principal sempre aparece primeiro
    function imagensOrdenadas(grupo) {
        const lista = imagensDoGrupo(grupo);
 
        return lista
            .filter(function (imagem) { return imagem.principal; })
            .concat(lista.filter(function (imagem) { return !imagem.principal; }));
    }
 
    function aplicarAmostra(amostra, cor) {
        amostra.parentElement.classList.toggle("sem-amostra", !cor);
 
        if (cor) {
            amostra.style.background = cor;
        }
    }
 
    // Chamada ao entrar na etapa 3
    function prepararEtapaImagens() {
        const ativas = variacoesAtivas();
 
        const gruposValidos = new Set(["geral"]);
        ativas.forEach(function (variacao) {
            gruposValidos.add(grupoDaVariacao(variacao));
        });
 
        // Descarta imagens de variações que foram excluídas
        imagens = imagens.filter(function (imagem) {
            if (gruposValidos.has(imagem.grupo)) return true;
 
            URL.revokeObjectURL(imagem.url);
            return false;
        });
 
        selectVariacaoImagem.replaceChildren();
 
        if (ativas.length === 0) {
            selectVariacaoImagem.appendChild(
                new Option("Produto sem variações", "geral")
            );
            selectVariacaoImagem.disabled = true;
            grupoAtual = "geral";
        } else {
            selectVariacaoImagem.disabled = false;
 
            selectVariacaoImagem.appendChild(
                new Option("Geral (todas as variações)", "geral")
            );
 
            ativas.forEach(function (variacao) {
                selectVariacaoImagem.appendChild(
                    new Option(rotuloDaVariacao(variacao), grupoDaVariacao(variacao))
                );
            });
 
            if (!gruposValidos.has(grupoAtual)) {
                grupoAtual = "geral";
            }
        }
 
        selectVariacaoImagem.value = grupoAtual;
        atualizarPainelImagens();
    }
 
    function atualizarPainelImagens() {
        const fundo = coresDeFundo[grupoAtual] || "";
 
        selectCorFundo.value = fundo;
        aplicarAmostra(amostraFundo, fundo || null);
 
        const variacao = variacoesAtivas().find(function (item) {
            return grupoDaVariacao(item) === grupoAtual;
        });
 
        aplicarAmostra(amostraVariacao, variacao ? corDaVariacao(variacao) : null);
 
        renderizarImagens();
    }
 
    function definirPrincipal(id) {
        const alvo = imagens.find(function (imagem) {
            return imagem.id === id;
        });
 
        if (!alvo) return;
 
        imagens.forEach(function (imagem) {
            if (imagem.grupo === alvo.grupo) {
                imagem.principal = imagem.id === id;
            }
        });
 
        renderizarImagens();
    }
 
    function removerImagem(id) {
        const indice = imagens.findIndex(function (imagem) {
            return imagem.id === id;
        });
 
        if (indice < 0) return;
 
        const removida = imagens.splice(indice, 1)[0];
        URL.revokeObjectURL(removida.url);
 
        // Se removeu a principal, a primeira restante assume
        if (removida.principal) {
            const proxima = imagens.find(function (imagem) {
                return imagem.grupo === removida.grupo;
            });
 
            if (proxima) proxima.principal = true;
        }
 
        limparErro(erroImagens);
        renderizarImagens();
    }
 
    function criarBotaoIcone(classeBotao, classeIcone, rotulo, aoClicar) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = classeBotao;
        botao.setAttribute("aria-label", rotulo);
        botao.title = rotulo;
 
        const icone = document.createElement("i");
        icone.className = classeIcone;
        icone.setAttribute("aria-hidden", "true");
        botao.appendChild(icone);
 
        botao.addEventListener("click", aoClicar);
 
        return botao;
    }
 
    function renderizarImagens() {
        listaImagens.replaceChildren();
 
        const lista = imagensOrdenadas(grupoAtual);
        const fundo = coresDeFundo[grupoAtual] || "";
 
        mensagemImagens.hidden = lista.length > 0;
        contadorImagens.textContent = lista.length + " de " + MAX_IMAGENS + " imagens";
 
        lista.forEach(function (imagem) {
            const cartao = document.createElement("div");
            cartao.className = "cartao-imagem";
 
            // Quadro com a cor de fundo escolhida
            const quadro = document.createElement("div");
            quadro.className = "quadro-imagem";
 
            if (fundo) {
                quadro.style.background = fundo;
            }
 
            const foto = document.createElement("img");
            foto.src = imagem.url;
            foto.alt = imagem.arquivo.name;
            foto.title = imagem.arquivo.name;
            quadro.appendChild(foto);
 
            if (imagem.principal) {
                const selo = document.createElement("span");
                selo.className = "selo-principal";
 
                const estrela = document.createElement("i");
                estrela.className = "fas fa-star";
                estrela.setAttribute("aria-hidden", "true");
 
                selo.appendChild(estrela);
                quadro.appendChild(selo);
            }
 
            // Rodapé: [espaço] [estrela ou rótulo] [lixeira]
            const rodape = document.createElement("div");
            rodape.className = "rodape-imagem";
            rodape.appendChild(document.createElement("span"));
 
            if (imagem.principal) {
                const rotulo = document.createElement("span");
                rotulo.className = "rotulo-principal";
                rotulo.textContent = "Imagem Principal";
                rodape.appendChild(rotulo);
            } else {
                rodape.appendChild(
                    criarBotaoIcone(
                        "btn-estrela",
                        "far fa-star",
                        "Definir como imagem principal",
                        function () { definirPrincipal(imagem.id); }
                    )
                );
            }
 
            rodape.appendChild(
                criarBotaoIcone(
                    "btn-remover-imagem",
                    "fas fa-trash",
                    "Excluir imagem " + imagem.arquivo.name,
                    function () { removerImagem(imagem.id); }
                )
            );
 
            cartao.append(quadro, rodape);
            listaImagens.appendChild(cartao);
        });
    }
 
    function adicionarArquivos(arquivos) {
        limparErro(erroImagens);
 
        const erros = [];
        let limiteAvisado = false;
 
        Array.from(arquivos).forEach(function (arquivo) {
            if (!TIPOS_IMAGEM.includes(arquivo.type)) {
                erros.push(arquivo.name + ": formato não aceito.");
                return;
            }
 
            if (arquivo.size > MAX_TAMANHO_IMAGEM) {
                erros.push(arquivo.name + ": maior que 5 MB.");
                return;
            }
 
            const doGrupo = imagensDoGrupo(grupoAtual);
 
            const repetido = doGrupo.some(function (existente) {
                return (
                    existente.arquivo.name === arquivo.name &&
                    existente.arquivo.size === arquivo.size &&
                    existente.arquivo.lastModified === arquivo.lastModified
                );
            });
 
            if (repetido) return;
 
            if (doGrupo.length >= MAX_IMAGENS) {
                if (!limiteAvisado) {
                    erros.push("Limite de " + MAX_IMAGENS + " imagens atingido.");
                    limiteAvisado = true;
                }
                return;
            }
 
            imagens.push({
                id: proximoIdImagem++,
                arquivo: arquivo,
                url: URL.createObjectURL(arquivo),
                grupo: grupoAtual,
                // A primeira imagem do grupo já é a principal
                principal: !doGrupo.some(function (imagem) {
                    return imagem.principal;
                })
            });
        });
 
        renderizarImagens();
 
        if (erros.length > 0) {
            mostrarErro(erroImagens, erros.join(" "));
        }
    }
 
    // Seleção por clique
    areaUpload.addEventListener("click", function () {
        entradaImagens.click();
    });
 
    areaUpload.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            entradaImagens.click();
        }
    });
 
    entradaImagens.addEventListener("change", function () {
        adicionarArquivos(entradaImagens.files);
        entradaImagens.value = "";
    });
 
    // Seleção por arrastar e soltar
    ["dragenter", "dragover"].forEach(function (nomeEvento) {
        areaUpload.addEventListener(nomeEvento, function (event) {
            event.preventDefault();
            areaUpload.classList.add("arrastando");
        });
    });
 
    ["dragleave", "drop"].forEach(function (nomeEvento) {
        areaUpload.addEventListener(nomeEvento, function (event) {
            event.preventDefault();
            areaUpload.classList.remove("arrastando");
        });
    });
 
    areaUpload.addEventListener("drop", function (event) {
        adicionarArquivos(event.dataTransfer.files);
    });
 
    // Troca de variação e de cor de fundo
    selectVariacaoImagem.addEventListener("change", function () {
        grupoAtual = selectVariacaoImagem.value;
        limparErro(erroImagens);
        atualizarPainelImagens();
    });
 
    selectCorFundo.addEventListener("change", function () {
        coresDeFundo[grupoAtual] = selectCorFundo.value;
        atualizarPainelImagens();
    });
 
    /*
       Antes de enviar: coloca todos os arquivos, em ordem, no campo
       "imagensProduto" e descreve os grupos em "imagensJson".
 
       imagensJson = {
           "grupos": [
               {
                   "variacao": null,            // null = imagens gerais
                   "corFundo": "#f2f2f2",       // ou null
                   "imagens": [
                       { "arquivo": 0, "principal": true },
                       { "arquivo": 1, "principal": false }
                   ]
               },
               { "variacao": 0, ... }           // posição em variacoesJson
           ]
       }
 
       "arquivo" é a posição em request.files.getlist("imagensProduto").
    */
    function sincronizarImagens() {
        const transferencia = new DataTransfer();
        const grupos = [];
        let posicao = 0;
 
        const ativas = variacoesAtivas();
 
        const ordemDosGrupos = [{ chave: "geral", variacao: null }].concat(
            ativas.map(function (variacao, indice) {
                return { chave: grupoDaVariacao(variacao), variacao: indice };
            })
        );
 
        ordemDosGrupos.forEach(function (grupo) {
            const doGrupo = imagensOrdenadas(grupo.chave);
 
            if (doGrupo.length === 0) return;
 
            grupos.push({
                variacao: grupo.variacao,
                corFundo: coresDeFundo[grupo.chave] || null,
                imagens: doGrupo.map(function (imagem) {
                    transferencia.items.add(imagem.arquivo);
 
                    return {
                        arquivo: posicao++,
                        principal: imagem.principal
                    };
                })
            });
        });
 
        imagensProduto.files = transferencia.files;
        imagensJson.value = JSON.stringify({ grupos: grupos });
    }
 
    /* =====================================
       CANCELAR: LIMPA TUDO E FECHA
    ===================================== */
 
    function resetarFormulario() {
        form.reset();
 
        atributos.length = 0;
        variacoes.length = 0;
 
        imagens.forEach(function (imagem) {
            URL.revokeObjectURL(imagem.url);
        });
 
        imagens = [];
        grupoAtual = "geral";
 
        Object.keys(coresDeFundo).forEach(function (chave) {
            delete coresDeFundo[chave];
        });
 
        valorBase.setCustomValidity("");
        formAtributo.hidden = true;
        limparErro(erroEtapa2);
        limparErro(erroImagens);
 
        atualizarModoProduto();
        atualizarListaAtributos();
        renderizarVariacoes();
        mostrarEtapa(0);
    }
 
    btnCancelar.addEventListener("click", function () {
        resetarFormulario();
        fecharModal();
    });
 
    /* =====================================
       PREPARAR DADOS PARA O FLASK
    ===================================== */
 
    function sincronizarCamposOcultos() {
        if (checkboxVariacoes.checked) {
            atributosJson.value = JSON.stringify(atributos);
 
            variacoesJson.value = JSON.stringify(
                variacoes.map(function (variacao) {
                    return {
                        combinacao: variacao.valores,
                        preco: variacao.preco / 100,
                        estoque: variacao.estoque
                    };
                })
            );
        } else {
            atributosJson.value = "[]";
            variacoesJson.value = "[]";
        }
    }
 
    /* =====================================
       VALIDAR ANTES DE SALVAR
    ===================================== */
 
    form.addEventListener("submit", function (event) {
        // Enter em um campo das etapas 1 e 2 não deve salvar
        if (indiceEtapa !== 2) {
            event.preventDefault();
            return;
        }
 
        if (!validarEtapaInicial()) {
            event.preventDefault();
            mostrarEtapa(0);
            return;
        }
 
        if (!validarEtapaVariacoes()) {
            event.preventDefault();
            mostrarEtapa(1);
            validarEtapaVariacoes(); // mostra a mensagem de erro na etapa 2
            return;
        }
 
        sincronizarCamposOcultos();
        sincronizarImagens();
 
        // Envia o valor base em formato decimal (ex.: 39.99)
        if (!checkboxVariacoes.checked) {
            valorBase.value = (centavosDe(valorBase.value) / 100).toFixed(2);
        }
 
        // O formulário será enviado para a rota Flask.
        // O backend processa atributosJson, variacoesJson e as imagens.
    });
 
    /* =====================================
       INICIALIZAÇÃO
    ===================================== */
 
    atualizarModoProduto();
    atualizarListaAtributos();
    renderizarVariacoes();
    mostrarEtapa(0);
});
 