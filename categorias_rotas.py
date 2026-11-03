"""
Rotas da tela de Categorias (Flask + MySQL).
 
Como usar no app.py (DEPOIS de criar o app = Flask(__name__)):
 
    from categorias_rotas import registrar_rotas_categorias
    registrar_rotas_categorias(app)
 
Antes de usar, rode o arquivo atualizar_banco.sql (cria a coluna "icone"
na tabela Categoria e cria as categorias padrão das lojas já cadastradas).
"""
 
import unicodedata
 
from flask import jsonify, redirect, render_template, request, session, url_for
from mysql.connector import errors as erros_mysql
 
from banco import conectar_banco
 
# Mesma lista de ícones do categorias.js (nomes do Font Awesome)
ICONES_PERMITIDOS = {
    "shirt", "person-dress", "person", "child", "shoe-prints",
    "bag-shopping", "gem", "glasses", "mobile-screen", "laptop",
    "headphones", "couch", "utensils", "dumbbell", "tag",
}
 
ICONE_PADRAO = "shirt"
TAMANHO_MAXIMO_NOME = 40
 
# Categorias criadas automaticamente para cada loja nova
CATEGORIAS_PADRAO = ["Feminino", "Masculino", "Unissex", "Infantil", "Plus"]
 
# Códigos de erro do MySQL
ERRO_DUPLICADO = 1062        # UNIQUE (idLoja, nome)
ERRO_EM_USO = 1451           # FK Produto -> Categoria (ON DELETE RESTRICT)
 
 
# ----------------------------------------------------------------------
# Funções que conversam com o banco
# ----------------------------------------------------------------------
def criar_categorias_padrao(cursor, id_loja):
    """
    Cria as categorias padrão de uma loja.
    Use logo depois do INSERT da Loja, antes do commit (veja o app.py).
    """
    cursor.executemany(
        "INSERT INTO Categoria (idLoja, nome, icone) VALUES (%s, %s, %s)",
        [(id_loja, nome, ICONE_PADRAO) for nome in CATEGORIAS_PADRAO],
    )
 
 
def listar_categorias(cursor, id_loja):
    cursor.execute(
        """
        SELECT idCategoria, nome, icone
        FROM Categoria
        WHERE idLoja = %s
        ORDER BY nome
        """,
        (id_loja,),
    )
 
    return cursor.fetchall()
 
 
def buscar_categoria(cursor, id_loja, id_categoria):
    cursor.execute(
        """
        SELECT idCategoria, nome, icone
        FROM Categoria
        WHERE idCategoria = %s AND idLoja = %s
        """,
        (id_categoria, id_loja),
    )
 
    return cursor.fetchone()
 
 
def nomes_em_uso(cursor, id_loja, ids):
    """Nomes das categorias (entre as de `ids`) que ainda têm produtos."""
    marcadores = ", ".join(["%s"] * len(ids))
 
    cursor.execute(
        f"""
        SELECT c.nome
        FROM Categoria c
        INNER JOIN Produto p
            ON p.idCategoria = c.idCategoria
           AND p.idLoja = c.idLoja
        WHERE c.idLoja = %s
          AND c.idCategoria IN ({marcadores})
        GROUP BY c.idCategoria, c.nome
        ORDER BY c.nome
        """,
        (id_loja, *ids),
    )
 
    return [linha["nome"] for linha in cursor.fetchall()]
 
 
# ----------------------------------------------------------------------
# Validação
# ----------------------------------------------------------------------
def _validar_dados(dados):
    """Devolve (nome, icone, erro)."""
    nome = " ".join(str(dados.get("nome", "")).split())
    icone = dados.get("icone") or ICONE_PADRAO
 
    if not nome:
        return None, None, "Informe o nome da categoria."
 
    if len(nome) > TAMANHO_MAXIMO_NOME:
        return None, None, f"O nome pode ter no máximo {TAMANHO_MAXIMO_NOME} caracteres."
 
    if icone not in ICONES_PERMITIDOS:
        icone = ICONE_PADRAO
 
    return nome, icone, None
 
 
def _erro(mensagem, status):
    return jsonify({"erro": mensagem}), status
 
 
# ----------------------------------------------------------------------
# Rotas
# ----------------------------------------------------------------------
def registrar_rotas_categorias(app):
    """Registra as rotas no app (os nomes são os usados no template)."""
 
    def categorias():
        if "idLoja" not in session:
            return redirect(url_for("login"))
 
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
 
        try:
            lista = listar_categorias(cursor, session["idLoja"])
        finally:
            cursor.close()
            conexao.close()
 
        return render_template("categorias.html", categorias=lista)
 
    def cadastrar_categoria():
        if "idLoja" not in session:
            return _erro("Sua sessão expirou. Entre novamente.", 401)
 
        nome, icone, erro = _validar_dados(request.get_json(silent=True) or {})
 
        if erro:
            return _erro(erro, 400)
 
        id_loja = session["idLoja"]
 
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
 
        try:
            cursor.execute(
                "INSERT INTO Categoria (idLoja, nome, icone) VALUES (%s, %s, %s)",
                (id_loja, nome, icone),
            )
 
            id_nova = cursor.lastrowid
            conexao.commit()
 
            categoria = buscar_categoria(cursor, id_loja, id_nova)
 
        except erros_mysql.IntegrityError as erro_banco:
            conexao.rollback()
 
            if erro_banco.errno == ERRO_DUPLICADO:
                return _erro("Já existe uma categoria com esse nome.", 400)
 
            print("Erro ao cadastrar categoria:", erro_banco)
            return _erro("Erro ao cadastrar a categoria.", 500)
 
        except Exception as erro_banco:
            conexao.rollback()
            print("Erro ao cadastrar categoria:", erro_banco)
            return _erro("Erro ao cadastrar a categoria.", 500)
 
        finally:
            cursor.close()
            conexao.close()
 
        return jsonify({"categoria": categoria}), 201
 
    def editar_categoria(id_categoria):
        if "idLoja" not in session:
            return _erro("Sua sessão expirou. Entre novamente.", 401)
 
        nome, icone, erro = _validar_dados(request.get_json(silent=True) or {})
 
        if erro:
            return _erro(erro, 400)
 
        id_loja = session["idLoja"]
 
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
 
        try:
            # Só edita categorias da loja logada
            if buscar_categoria(cursor, id_loja, id_categoria) is None:
                return _erro("Categoria não encontrada.", 404)
 
            cursor.execute(
                """
                UPDATE Categoria
                SET nome = %s, icone = %s
                WHERE idCategoria = %s AND idLoja = %s
                """,
                (nome, icone, id_categoria, id_loja),
            )
 
            conexao.commit()
 
            categoria = buscar_categoria(cursor, id_loja, id_categoria)
 
        except erros_mysql.IntegrityError as erro_banco:
            conexao.rollback()
 
            if erro_banco.errno == ERRO_DUPLICADO:
                return _erro("Já existe uma categoria com esse nome.", 400)
 
            print("Erro ao editar categoria:", erro_banco)
            return _erro("Erro ao editar a categoria.", 500)
 
        except Exception as erro_banco:
            conexao.rollback()
            print("Erro ao editar categoria:", erro_banco)
            return _erro("Erro ao editar a categoria.", 500)
 
        finally:
            cursor.close()
            conexao.close()
 
        return jsonify({"categoria": categoria})
 
    def excluir_categoria():
        if "idLoja" not in session:
            return _erro("Sua sessão expirou. Entre novamente.", 401)
 
        dados = request.get_json(silent=True) or {}
 
        try:
            ids = sorted({int(i) for i in dados.get("ids", [])})
        except (TypeError, ValueError):
            return _erro("Dados inválidos.", 400)
 
        if not ids:
            return _erro("Selecione ao menos uma categoria.", 400)
 
        id_loja = session["idLoja"]
 
        conexao = conectar_banco()
        cursor = conexao.cursor(dictionary=True)
 
        try:
            # Todas precisam existir e pertencer à loja logada
            marcadores = ", ".join(["%s"] * len(ids))
 
            cursor.execute(
                f"""
                SELECT idCategoria
                FROM Categoria
                WHERE idLoja = %s AND idCategoria IN ({marcadores})
                """,
                (id_loja, *ids),
            )
 
            if len(cursor.fetchall()) != len(ids):
                return _erro("Alguma categoria não foi encontrada.", 404)
 
            # Categoria com produtos não pode ser excluída
            em_uso = nomes_em_uso(cursor, id_loja, ids)
 
            if em_uso:
                return _erro(
                    "Não é possível excluir categorias que possuem produtos: "
                    + ", ".join(em_uso) + ".",
                    409,
                )
 
            cursor.execute(
                f"""
                DELETE FROM Categoria
                WHERE idLoja = %s AND idCategoria IN ({marcadores})
                """,
                (id_loja, *ids),
            )
 
            conexao.commit()
 
        except erros_mysql.IntegrityError as erro_banco:
            conexao.rollback()
 
            if erro_banco.errno == ERRO_EM_USO:
                return _erro(
                    "Não é possível excluir categorias que possuem produtos.",
                    409,
                )
 
            print("Erro ao excluir categoria:", erro_banco)
            return _erro("Erro ao excluir a categoria.", 500)
 
        except Exception as erro_banco:
            conexao.rollback()
            print("Erro ao excluir categoria:", erro_banco)
            return _erro("Erro ao excluir a categoria.", 500)
 
        finally:
            cursor.close()
            conexao.close()
 
        return jsonify({"excluidas": ids})
 
    app.add_url_rule("/categorias", "categorias", categorias)
    app.add_url_rule(
        "/categorias/cadastrar", "cadastrar_categoria",
        cadastrar_categoria, methods=["POST"],
    )
    app.add_url_rule(
        "/categorias/<int:id_categoria>/editar", "editar_categoria",
        editar_categoria, methods=["POST"],
    )
    app.add_url_rule(
        "/categorias/excluir", "excluir_categoria",
        excluir_categoria, methods=["POST"],
    )
 