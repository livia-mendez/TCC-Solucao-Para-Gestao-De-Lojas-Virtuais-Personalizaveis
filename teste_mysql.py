import mysql.connector

conexao = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Al24091517!",
    database="tcc_gestao_loja"
)

print("Conexão com MySQL realizada com sucesso!")

conexao.close()