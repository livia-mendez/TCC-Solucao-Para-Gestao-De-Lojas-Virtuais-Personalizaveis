import json
import os
import uuid
 
from flask import Flask, render_template, request, redirect, url_for, session, abort
from werkzeug.security import generate_password_hash, check_password_hash
 
from banco import conectar_banco
 
from categorias_rotas import registrar_rotas_categorias, criar_categorias_padrao
from personalizacao_rotas import registrar_rotas_personalizacao
 
 
# O app precisa ser criado ANTES de qualquer uso de app.root_path / app.config
app = Flask(__name__)
 
app.secret_key = "chave-secreta-do-tcc"
 
# Upload de imagens dos produtos
PASTA_UPLOAD = os.path.join(app.root_path, "static", "uploads", "produtos")
EXTENSOES_OK = {"png", "jpg", "jpeg", "webp"}
os.makedirs(PASTA_UPLOAD, exist_ok=True)
 
# 8 imagens de 5 MB + folga
app.config["MAX_CONTENT_LENGTH"] = 60 * 1024 * 1024
 
 
def salvar_imagem(arquivo):
    """Salva o arquivo e devolve o caminho relativo a /static (ou None)."""
    if not arquivo or not arquivo.filename or "." not in arquivo.filename:
        return None
 
    extensao = arquivo.filename.rsplit(".", 1)[-1].lower()
 
    if extensao not in EXTENSOES_OK:
        return None
 
    nome = f"{uuid.uuid4().hex}.{extensao}"
    arquivo.save(os.path.join(PASTA_UPLOAD, nome))
 
    return f"uploads/produtos/{nome}"
 
 
# Rotas da tela de categorias (/categorias e as de cadastrar, editar e excluir)
registrar_rotas_categorias(app)
 
# API da tela de personalização (/api/personalizacao) e tema das cores
registrar_rotas_personalizacao(app)
 
 
def usuario_logado():
    return "idLoja" in session
 
 
@app.route("/")
def inicio():
 
    conexao = conectar_banco()
    cursor = conexao.cursor()
 
    cursor.execute("SELECT * FROM Produto")
    produtos = cursor.fetchall()
 
    cursor.close()
    conexao.close()
 
    return f"Produtos encontrados: {produtos}"
 
 
@app.route("/cadastro", methods=["GET", "POST"])
def cadastro():
 
    if request.method == "GET":
        return render_template("cadastro.html")
 
    nome = request.form["nome"]
    telefone = request.form["telefone"]
    email = request.form["email"]
    senha = request.form["senha"]
    confirma_senha = request.form["confirma_senha"]
 
    if senha != confirma_senha:
        return "As senhas não coincidem."
 
    conexao = conectar_banco()
    cursor = conexao.cursor()
 
    cursor.execute(
        "SELECT idLoja FROM Loja WHERE email = %s",
        (email,)
    )
 
    loja_existente = cursor.fetchone()
 
    if loja_existente:
        cursor.close()
        conexao.close()
        return "Este e-mail já está cadastrado."
 
    senha_hash = generate_password_hash(senha)
 
    comando = """
        INSERT INTO Loja
        (nome, email, senha, telefone)
        VALUES (%s, %s, %s, %s)
    """
 
    valores = (nome, email, senha_hash, telefone)
 
    cursor.execute(comando, valores)
 
    # Categorias padrão (Feminino, Masculino, Unissex, Infantil e Plus)
    criar_categorias_padrao(cursor, cursor.lastrowid)
 
    conexao.commit()
 
    cursor.close()
    conexao.close()
 
    return redirect(url_for("login"))
 
 
@app.route("/login", methods=["GET", "POST"])
def login():
 
    if request.method == "GET":
        return render_template("login.html")
 
    email = request.form["email"]
    senha = request.form["senha"]
 
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)
 
    cursor.execute(
        "SELECT idLoja, nome, email, senha FROM Loja WHERE email = %s",
        (email,)
    )
 
    loja = cursor.fetchone()
 
    cursor.close()
    conexao.close()
 
    if loja is None:
        return "E-mail ou senha incorretos."
 
    if not check_password_hash(loja["senha"], senha):
        return "E-mail ou senha incorretos."
 
    session["idLoja"] = loja["idLoja"]
    session["nomeLoja"] = loja["nome"]
 
    return redirect(url_for("home"))
 
 
@app.route("/home")
def home():
    if not usuario_logado():
        return redirect(url_for("login"))
 
    return render_template("home.html")
 
 
@app.route("/produtos")
def produtos():
    if not usuario_logado():
        return redirect(url_for("login"))
 
    id_loja = session["idLoja"]
 
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)
 
    # Busca somente as categorias da loja logada
    cursor.execute("""
        SELECT idCategoria, nome
        FROM Categoria
        WHERE idLoja = %s
        ORDER BY nome
    """, (id_loja,))
 
    categorias = cursor.fetchall()
 
    # Busca somente os produtos da loja logada
    cursor.execute("""
        SELECT
            p.idProduto,
            p.nome,
            p.descricao,
            p.valorBase,
            p.codigoSKU,
            p.estoque,
            p.imagem,
            p.possuiVariacoes,
            c.nome AS categoria
        FROM Produto p
        INNER JOIN Categoria c
            ON p.idCategoria = c.idCategoria
            AND p.idLoja = c.idLoja
        WHERE p.idLoja = %s
        ORDER BY p.idProduto DESC
    """, (id_loja,))
 
    produtos = cursor.fetchall()
 
    cursor.close()
    conexao.close()
 
    return render_template(
        "produtos.html",
        produtos=produtos,
        categorias=categorias
    )
 
 
@app.route("/cadastrar-produto", methods=["POST"])
def cadastrar_produto():
 
    if not usuario_logado():
        return redirect(url_for("login"))
 
    id_loja = session["idLoja"]
 
    nome = request.form.get("nome", "").strip()
    descricao = request.form.get("descricao", "").strip()
    id_categoria = request.form.get("idCategoria")
    codigo_sku = request.form.get("codigoSKU", "").strip()
    possui_variacoes = request.form.get("possuiVariacoes") == "1"
 
    # Validação básica
    if not nome:
        return "O nome do produto é obrigatório."
 
    if not id_categoria:
        return "Selecione uma categoria."
 
    if not codigo_sku:
        return "Informe o SKU do produto."
 
    variacoes = []
 
    try:
        id_categoria = int(id_categoria)
 
        if possui_variacoes:
            # Preço e estoque ficam nas variações
            variacoes = json.loads(request.form.get("variacoesJson", "[]"))
 
            if not variacoes:
                return "Adicione pelo menos uma variação."
 
            # Valor base = menor preço entre as variações
            valor_base = min(float(v["preco"]) for v in variacoes)
            # Estoque total = soma do estoque das variações
            estoque = sum(int(v["estoque"]) for v in variacoes)
        else:
            valor_base = float(request.form.get("valorBase", "").replace(",", "."))
            estoque = int(request.form.get("estoque", ""))
 
    except (ValueError, KeyError, TypeError):
        return "Valores inválidos."
 
    if valor_base < 0:
        return "O preço não pode ser negativo."
 
    if estoque < 0:
        return "O estoque não pode ser negativo."
 
    conexao = conectar_banco()
    cursor = conexao.cursor()
 
    try:
 
        # Confirma que a categoria pertence à loja logada
        cursor.execute("""
            SELECT idCategoria
            FROM Categoria
            WHERE idCategoria = %s
              AND idLoja = %s
        """, (id_categoria, id_loja))
 
        categoria = cursor.fetchone()
 
        if categoria is None:
            return "Categoria inválida."
 
        # Verifica se o SKU já existe nessa loja
        cursor.execute("""
            SELECT idProduto
            FROM Produto
            WHERE idLoja = %s
              AND codigoSKU = %s
        """, (id_loja, codigo_sku))
 
        sku_existente = cursor.fetchone()
 
        if sku_existente:
            return "Este SKU já está cadastrado."
 
        # Insere o produto
        cursor.execute("""
            INSERT INTO Produto
            (
                idLoja,
                idCategoria,
                nome,
                descricao,
                valorBase,
                codigoSKU,
                estoque,
                possuiVariacoes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            id_loja,
            id_categoria,
            nome,
            descricao,
            valor_base,
            codigo_sku,
            estoque,
            possui_variacoes
        ))
 
        id_produto = cursor.lastrowid
 
        # -----------------------------------------
        # Variações (mesma ordem de variacoesJson)
        # -----------------------------------------
        ids_variacoes = []
 
        if possui_variacoes:
            for v in variacoes:
                combinacao = v["combinacao"]  # {"Cor": "Azul", "Tamanho": "M"}
 
                cursor.execute("""
                    INSERT INTO VariacaoProduto
                        (idProduto, nomeVariacao, atributos, preco, estoque)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    id_produto,
                    " / ".join(str(valor) for valor in combinacao.values()),
                    json.dumps(combinacao, ensure_ascii=False),
                    float(v["preco"]),
                    int(v["estoque"])
                ))
 
                ids_variacoes.append(cursor.lastrowid)
 
        # -----------------------------------------
        # Imagens
        # -----------------------------------------
        arquivos = request.files.getlist("imagensProduto")
        dados_imagens = json.loads(request.form.get("imagensJson", "{}"))
        imagem_capa = None
 
        for grupo in dados_imagens.get("grupos", []):
            posicao = grupo.get("variacao")
 
            if posicao is not None:
                if posicao >= len(ids_variacoes):
                    continue
                id_variacao = ids_variacoes[posicao]
            else:
                id_variacao = None
 
            for ordem, info in enumerate(grupo.get("imagens", [])):
                indice_arquivo = info.get("arquivo")
 
                if indice_arquivo is None or indice_arquivo >= len(arquivos):
                    continue
 
                caminho = salvar_imagem(arquivos[indice_arquivo])
 
                if not caminho:
                    continue
 
                cursor.execute("""
                    INSERT INTO ImagemProduto
                        (idProduto, idVariacao, caminho, corFundo, principal, ordem)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    id_produto,
                    id_variacao,
                    caminho,
                    grupo.get("corFundo"),
                    bool(info.get("principal")),
                    ordem
                ))
 
                # Capa do card = principal do grupo geral (ou a primeira salva)
                if imagem_capa is None or (posicao is None and info.get("principal")):
                    imagem_capa = caminho
 
        if imagem_capa:
            cursor.execute(
                "UPDATE Produto SET imagem = %s WHERE idProduto = %s",
                (imagem_capa, id_produto)
            )
 
        conexao.commit()
 
    except Exception as erro:
 
        conexao.rollback()
        print("Erro ao cadastrar produto:", erro)
 
        return "Erro ao cadastrar o produto."
 
    finally:
 
        cursor.close()
        conexao.close()
 
    return redirect(url_for("produtos"))
 
 
@app.route("/produto/<int:id_produto>")
def produto_detalhes(id_produto):
    if not usuario_logado():
        return redirect(url_for("login"))
 
    id_loja = session["idLoja"]
 
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)
 
    # Filtra também pela loja logada, para uma loja não abrir
    # o produto de outra só trocando o número na URL
    cursor.execute("""
        SELECT
            p.idProduto,
            p.nome,
            p.descricao,
            p.valorBase,
            p.codigoSKU,
            p.estoque,
            p.imagem,
            p.possuiVariacoes,
            c.nome AS categoria
        FROM Produto p
        INNER JOIN Categoria c
            ON p.idCategoria = c.idCategoria
            AND p.idLoja = c.idLoja
        WHERE p.idProduto = %s
          AND p.idLoja = %s
    """, (id_produto, id_loja))
 
    produto = cursor.fetchone()
 
    if produto is None:
        cursor.close()
        conexao.close()
        abort(404)
 
    # Variações do produto
    cursor.execute("""
        SELECT idVariacao, atributos
        FROM VariacaoProduto
        WHERE idProduto = %s
        ORDER BY idVariacao
    """, (id_produto,))
 
    variacoes = cursor.fetchall()
 
    # Imagens do produto (principal primeiro)
    cursor.execute("""
        SELECT caminho, corFundo, principal
        FROM ImagemProduto
        WHERE idProduto = %s
        ORDER BY principal DESC, ordem
    """, (id_produto,))
 
    imagens = cursor.fetchall()
 
    cursor.close()
    conexao.close()
 
    # Monta {"Cor": ["Azul", "Rosa"], "Tamanho": ["P", "M"]}
    atributos = {}
 
    for v in variacoes:
        bruto = v["atributos"]
 
        if not bruto:
            continue
 
        # O conector do MySQL pode devolver a coluna JSON como texto/bytes
        if isinstance(bruto, (bytes, bytearray)):
            bruto = bruto.decode("utf-8")
 
        valores = json.loads(bruto) if isinstance(bruto, str) else bruto
 
        for nome_atributo, opcao in valores.items():
            lista = atributos.setdefault(nome_atributo, [])
 
            if opcao not in lista:
                lista.append(opcao)
 
    return render_template(
        "produto_detalhes.html",
        produto=produto,
        atributos=atributos,
        imagens=imagens
    )
 
 
@app.route("/pedidos")
def pedidos():
    if not usuario_logado():
        return redirect(url_for("login"))
 
    return render_template("pedidos.html")
 
 
@app.route("/pedidosdetalhes")
def pedidosdetalhes():
    if not usuario_logado():
        return redirect(url_for("login"))
 
    return render_template("pedidos_detalhes.html")
 
 
@app.route("/configuracoesloja")
def configuracoes_loja():
    if not usuario_logado():
        return redirect(url_for("login"))
 
    return render_template("configuracoes_loja.html")
 
 
@app.route("/sair")
def sair():
    session.clear()
    return redirect(url_for("login"))
 
 
@app.route("/personalizacao")
def personalizacao():
    if not usuario_logado():
        return redirect(url_for("login"))
 
    return render_template("personalizar_loja.html")
 
 
@app.route("/visualizacao")
def visualizacao():
    if not usuario_logado():
        return redirect(url_for("login"))
 
    return render_template("visualizar_loja.html")
 
 
@app.route("/base")
def base():
    return render_template("base.html")
 
 
if __name__ == "__main__":
    app.run(debug=True)
    