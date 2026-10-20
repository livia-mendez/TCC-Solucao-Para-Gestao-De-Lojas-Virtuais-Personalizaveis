
document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("modalProduto");
    const form = document.getElementById("formProduto");

    const btnAbrir = document.getElementById("btnAbrirModal");
    const btnFechar = document.getElementById("btnFecharModal");
    const btnVoltar = document.getElementById("btnVoltar");
    const btnProximo = document.getElementById("btnProximo");
    const btnSalvar = document.getElementById("btnSalvar");

    const checkboxVariacoes =
        document.getElementById("possuiVariacoes");

    const campoValor = document.getElementById("campoValor");
    const campoEstoque = document.getElementById("campoEstoque");
    const valorBase = document.getElementById("valorBase");
    const estoque = document.getElementById("estoque");

    const indicador = document.getElementById("etapaAtual");
    const etapas = [
        document.getElementById("etapa1"),
        document.getElementById("etapa2"),
        document.getElementById("etapa3")
    ];

    const btnNovoAtributo =
        document.getElementById("btnNovoAtributo");

    const formAtributo =
        document.getElementById("formAtributo");

    const btnAdicionarAtributo =
        document.getElementById("btnAdicionarAtributo");

    const nomeAtributo =
        document.getElementById("nomeAtributo");

    const opcoesAtributo =
        document.getElementById("opcoesAtributo");

    const listaAtributos =
        document.getElementById("listaAtributos");

    const mensagemAtributos =
        document.getElementById("mensagemAtributos");

    const atributosJson =
        document.getElementById("atributosJson");

    const imagensProduto =
        document.getElementById("imagensProduto");

    const listaImagens =
        document.getElementById("listaImagens");

    let etapaAtual = 0;
    const atributos = [];

    /* Abre e fecha o modal */

    function abrirModal() {
        modal.classList.add("ativo");
        document.body.style.overflow = "hidden";
    }

    function fecharModal() {
        modal.classList.remove("ativo");
        document.body.style.overflow = "";
    }

    btnAbrir.addEventListener("click", abrirModal);
    btnFechar.addEventListener("click", fecharModal);

    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            fecharModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modal.classList.contains("ativo")) {
            fecharModal();
        }
    });

    /* Exibe a etapa selecionada */

    function mostrarEtapa(indice) {
        etapaAtual = indice;

        etapas.forEach(function (etapa, i) {
            etapa.hidden = i !== indice;
            etapa.classList.toggle("ativa", i === indice);
        });

        btnVoltar.hidden = indice === 0;
        btnProximo.hidden = indice === 2;
        btnSalvar.hidden = indice !== 2;

        indicador.style.left = ["0%", "50%", "100%"][indice];

        modal.querySelector(".modal-produto").scrollTop = 0;
    }

    /* Ajusta os campos conforme o checkbox */

    function atualizarModoProduto() {
        const possuiVariacoes = checkboxVariacoes.checked;

        campoValor.hidden = possuiVariacoes;
        campoEstoque.hidden = possuiVariacoes;

        valorBase.required = !possuiVariacoes;
        estoque.required = !possuiVariacoes;

        if (possuiVariacoes) {
            valorBase.value = "";
            estoque.value = "0";
        }
    }

    checkboxVariacoes.addEventListener(
        "change",
        atualizarModoProduto
    );

    /* Valida os campos básicos antes de avançar */

    function validarEtapaInicial() {
        const campos = etapas[0].querySelectorAll(
            "input:not([type='checkbox']), select, textarea"
        );

        for (const campo of campos) {
            if (
                campo.required &&
                !campo.checkValidity()
            ) {
                campo.reportValidity();
                campo.focus();
                return false;
            }
        }

        return true;
    }

    /* Botão Próximo */

    btnProximo.addEventListener("click", function () {
        if (etapaAtual === 0) {
            if (!validarEtapaInicial()) {
                return;
            }

            if (checkboxVariacoes.checked) {
                mostrarEtapa(1);
            } else {
                mostrarEtapa(2);
            }

            return;
        }

        if (etapaAtual === 1) {
            if (atributos.length === 0) {
                alert("Adicione pelo menos um atributo para continuar.");
                return;
            }

            mostrarEtapa(2);
        }
    });

    /* Botão Voltar */

    btnVoltar.addEventListener("click", function () {
        if (etapaAtual === 2 && checkboxVariacoes.checked) {
            mostrarEtapa(1);
        } else if (etapaAtual > 0) {
            mostrarEtapa(0);
        }
    });

    /* Abre o formulário de novo atributo */

    btnNovoAtributo.addEventListener("click", function () {
        formAtributo.hidden = false;
        nomeAtributo.focus();
    });

    /* Adiciona um atributo à lista */

    btnAdicionarAtributo.addEventListener("click", function () {
        const nome = nomeAtributo.value.trim();

        const opcoes = opcoesAtributo.value
            .split(",")
            .map(function (opcao) {
                return opcao.trim();
            })
            .filter(Boolean);

        if (!nome) {
            alert("Informe o nome do atributo.");
            nomeAtributo.focus();
            return;
        }

        if (opcoes.length === 0) {
            alert("Informe pelo menos uma opção.");
            opcoesAtributo.focus();
            return;
        }

        const nomeDuplicado = atributos.some(function (atributo) {
            return atributo.nome.toLowerCase() === nome.toLowerCase();
        });

        if (nomeDuplicado) {
            alert("Esse atributo já foi cadastrado.");
            nomeAtributo.focus();
            return;
        }

        atributos.push({
            nome: nome,
            opcoes: [...new Set(opcoes)]
        });

        atualizarListaAtributos();

        nomeAtributo.value = "";
        opcoesAtributo.value = "";
        formAtributo.hidden = true;
    });

    function atualizarListaAtributos() {
        listaAtributos
            .querySelectorAll(".item-atributo")
            .forEach(function (item) {
                item.remove();
            });

        mensagemAtributos.hidden = atributos.length > 0;

        atributos.forEach(function (atributo) {
            const item = document.createElement("div");
            item.className = "item-atributo";

            const titulo = document.createElement("strong");
            titulo.textContent = atributo.nome;

            const opcoes = document.createElement("div");
            opcoes.className = "opcoes-atributo";

            atributo.opcoes.forEach(function (opcao) {
                const etiqueta = document.createElement("span");
                etiqueta.className = "opcao-atributo";
                etiqueta.textContent = opcao;
                opcoes.appendChild(etiqueta);
            });

            item.append(titulo, opcoes);
            listaAtributos.appendChild(item);
        });

        atributosJson.value = JSON.stringify(atributos);
    }

    /* Pré-visualização das imagens selecionadas */

    imagensProduto.addEventListener("change", function () {
        listaImagens.replaceChildren();

        Array.from(imagensProduto.files).forEach(function (arquivo) {
            if (!arquivo.type.startsWith("image/")) {
                return;
            }

            const imagem = document.createElement("img");
            imagem.alt = arquivo.name;

            const leitor = new FileReader();

            leitor.addEventListener("load", function () {
                imagem.src = leitor.result;
            });

            leitor.readAsDataURL(arquivo);
            listaImagens.appendChild(imagem);
        });
    });

    /* Envio do formulário */

    form.addEventListener("submit", function (event) {
        if (etapaAtual !== 2) {
            event.preventDefault();
            return;
        }

        if (
            checkboxVariacoes.checked &&
            atributos.length === 0
        ) {
            event.preventDefault();
            alert("Cadastre os atributos antes de salvar o produto.");
            mostrarEtapa(1);
        }
    });

    atualizarModoProduto();
    mostrarEtapa(0);
});
