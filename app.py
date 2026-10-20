from flask import Flask, render_template, request, redirect, url_for, session
from werkzeug.security import generate_password_hash, check_password_hash

from banco import conectar_banco


app = Flask(__name__)

app.secret_key = "chave-secreta-do-tcc"

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
    valor_base = request.form.get("valorBase")
    codigo_sku = request.form.get("codigoSKU", "").strip()
    estoque = request.form.get("estoque")
    possui_variacoes = request.form.get("possuiVariacoes") == "1"

    # Validação básica
    if not nome:
        return "O nome do produto é obrigatório."

    if not id_categoria:
        return "Selecione uma categoria."

    if not valor_base:
        return "Informe o preço do produto."

    if not codigo_sku:
        return "Informe o SKU do produto."

    if estoque is None or estoque == "":
        return "Informe o estoque."

    try:
        valor_base = float(valor_base.replace(",", "."))
        estoque = int(estoque)
        id_categoria = int(id_categoria)
    except ValueError:
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

        conexao.commit()

    except Exception as erro:

        conexao.rollback()
        print("Erro ao cadastrar produto:", erro)

        return "Erro ao cadastrar o produto."

    finally:

        cursor.close()
        conexao.close()

    return redirect(url_for("produtos"))



@app.route("/produtodetalhes")
def produto_detalhes():
    if not usuario_logado():
        return redirect(url_for("login"))

    return render_template("produto_detalhes.html")


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