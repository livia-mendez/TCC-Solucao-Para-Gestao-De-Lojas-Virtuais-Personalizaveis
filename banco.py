
import os
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

# Carrega o .env que fica na pasta deste arquivo
caminho_env = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=caminho_env)


def conectar_banco():
    conexao = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )

    return conexao
