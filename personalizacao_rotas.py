"""Rotas da tela Personalizar Loja (API usada pelo personalizar_loja.js).
 
A página em si (/personalizacao) continua no app.py.
Uso no app.py:
    from personalizacao_rotas import registrar_rotas_personalizacao
    registrar_rotas_personalizacao(app)
"""
import json
import os
import re
import time
import traceback
 
from flask import jsonify, request, session
from werkzeug.utils import secure_filename
 
from banco import conectar_banco
 
CORES_PADRAO = {
    "principal": "#972BB2",
    "caixas": "#FAEFFD",
    "fundo": "#ECCCFA",
    "menuSuperior": "#972BB2",
    "menuLateral": "#972BB2",
    "itensMenuLateral": "#FFFFFF",
    "itensMenuSuperior": "#FFFFFF",
    "barraPesquisa": "#F1E5FB",
    "textoPrincipal": "#000000",
    "iconesBotoes": "#FFFFFF",
}
 
# Chave da cor -> variável CSS usada nas páginas
VARIAVEIS_CSS = {
    "principal": "--cor-principal",
    "caixas": "--cor-caixas",
    "fundo": "--cor-fundo",
    "menuSuperior": "--cor-menu-superior",
    "menuLateral": "--cor-menu-lateral",
    "itensMenuLateral": "--cor-itens-lateral",
    "itensMenuSuperior": "--cor-itens-superior",
    "barraPesquisa": "--cor-busca",
    "textoPrincipal": "--cor-texto",
    "iconesBotoes": "--cor-icones",
}
 
EXTENSOES_PERMITIDAS = {"jpg", "jpeg", "png"}
TAMANHO_MAXIMO = 5 * 1024 * 1024  # 5 MB por imagem
PASTA_RELATIVA = os.path.join("static", "uploads", "lojas")
 
 
def registrar_erro(contexto, erro):
    """Mostra o erro completo no terminal do Flask, com dica para os casos mais comuns."""
    print(f"[personalizacao] {contexto}: {erro}")
    traceback.print_exc()
    texto = str(erro)
    if "Unknown column" in texto:
        print("[personalizacao] DICA: falta uma coluna. Rode o ALTER TABLE do arquivo personalizacao.sql.")
    elif "doesn't exist" in texto:
        print("[personalizacao] DICA: a tabela PersonalizacaoLoja não existe no banco que o banco.py usa.")
 
 
def cor_valida(valor):
    return isinstance(valor, str) and re.fullmatch(r"#[0-9A-Fa-f]{6}", valor) is not None
 
 
def buscar_personalizacao(id_loja):
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)
    cursor.execute(
        "SELECT logo, banner, cores FROM PersonalizacaoLoja WHERE idLoja = %s",
        (id_loja,),
    )
    linha = cursor.fetchone()
    cursor.close()
    conexao.close()
 
    config = {"logo": None, "banner": None, "cores": dict(CORES_PADRAO)}
    if linha:
        config["logo"] = linha["logo"]
        config["banner"] = linha["banner"]
        try:
            salvas = json.loads(linha["cores"] or "{}")
        except ValueError:
            salvas = {}
        for chave, valor in salvas.items():
            if chave in CORES_PADRAO and cor_valida(valor):
                config["cores"][chave] = valor.upper()
    return config
 
 
def gravar_personalizacao(id_loja, config):
    conexao = conectar_banco()
    cursor = conexao.cursor()
    try:
        cursor.execute("""
            INSERT INTO PersonalizacaoLoja (idLoja, logo, banner, cores)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                logo = VALUES(logo),
                banner = VALUES(banner),
                cores = VALUES(cores)
        """, (
            id_loja,
            config["logo"],
            config["banner"],
            json.dumps(config["cores"]),
        ))
        conexao.commit()
    except Exception:
        conexao.rollback()
        raise
    finally:
        cursor.close()
        conexao.close()
 
 
def registrar_rotas_personalizacao(app):
 
    @app.get("/api/personalizacao")
    def api_obter_personalizacao():
        if "idLoja" not in session:
            return jsonify(erro="Faça login para continuar."), 401
        try:
            return jsonify(buscar_personalizacao(session["idLoja"]))
        except Exception as erro:
            registrar_erro("ao carregar", erro)
            return jsonify(erro="Não foi possível carregar a personalização."), 500
 
    @app.post("/api/personalizacao")
    def api_salvar_personalizacao():
        if "idLoja" not in session:
            return jsonify(erro="Faça login para continuar."), 401
 
        id_loja = session["idLoja"]
        try:
            config = buscar_personalizacao(id_loja)
        except Exception as erro:
            registrar_erro("ao ler antes de salvar", erro)
            return jsonify(erro="Não foi possível ler a personalização atual."), 500
 
        # Cores
        try:
            enviadas = json.loads(request.form.get("cores", "{}"))
        except ValueError:
            return jsonify(erro="Cores inválidas."), 400
 
        for chave, valor in enviadas.items():
            if chave in CORES_PADRAO and cor_valida(valor):
                config["cores"][chave] = valor.upper()
 
        # Imagens (logo e banner), uma por loja
        pasta = os.path.join(app.root_path, PASTA_RELATIVA)
        os.makedirs(pasta, exist_ok=True)
 
        for campo in ("logo", "banner"):
            arquivo = request.files.get(campo)
            if not arquivo or not arquivo.filename:
                continue
 
            nome_original = secure_filename(arquivo.filename)
            ext = nome_original.rsplit(".", 1)[-1].lower() if "." in nome_original else ""
            if ext not in EXTENSOES_PERMITIDAS:
                return jsonify(erro=f"Formato inválido em {campo}. Use JPEG ou PNG."), 400
 
            arquivo.seek(0, os.SEEK_END)
            tamanho = arquivo.tell()
            arquivo.seek(0)
            if tamanho > TAMANHO_MAXIMO:
                return jsonify(erro=f"A imagem de {campo} passa de 5 MB."), 400
 
            nome = f"{campo}_{id_loja}.{ext}"
            arquivo.save(os.path.join(pasta, nome))
            # ?v= evita o navegador mostrar a imagem antiga em cache
            config[campo] = f"/static/uploads/lojas/{nome}?v={int(time.time())}"
 
        try:
            gravar_personalizacao(id_loja, config)
        except Exception as erro:
            registrar_erro("ao salvar", erro)
            return jsonify(erro="Erro ao salvar as alterações."), 500
 
        return jsonify(config)
 
    # Deixa o tema disponível em TODOS os templates (use no base.html)
    @app.context_processor
    def injetar_tema():
        if "idLoja" not in session:
            return {}
        try:
            config = buscar_personalizacao(session["idLoja"])
        except Exception as erro:
            registrar_erro("ao carregar o tema", erro)
            return {}
        declaracoes = ";".join(
            f"{VARIAVEIS_CSS[chave]}:{valor}" for chave, valor in config["cores"].items()
        )
        return {
            "tema_css": f":root{{{declaracoes}}}",
            "tema_logo": config["logo"],
            "tema_banner": config["banner"],
        }
 