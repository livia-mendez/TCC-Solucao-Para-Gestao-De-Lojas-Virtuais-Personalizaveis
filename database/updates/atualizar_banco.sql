-- ============================================================
-- Atualização do banco para a tela de Categorias
-- Rode UMA vez no MySQL (Workbench ou terminal), com o banco
-- tcc_gestao_loja selecionado.
-- ============================================================
 
USE tcc_gestao_loja;
 
-- 1. Coluna do ícone da categoria (nome do ícone do Font Awesome)
ALTER TABLE Categoria
    ADD COLUMN icone VARCHAR(30) NOT NULL DEFAULT 'shirt' AFTER nome;
 
-- 2. Categorias padrão para as lojas que ainda não têm nenhuma
INSERT INTO Categoria (idLoja, nome, icone)
SELECT l.idLoja, c.nome, 'shirt'
FROM Loja l
CROSS JOIN (
    SELECT 'Feminino'  AS nome
    UNION ALL SELECT 'Masculino'
    UNION ALL SELECT 'Unissex'
    UNION ALL SELECT 'Infantil'
    UNION ALL SELECT 'Plus'
) c
WHERE NOT EXISTS (
    SELECT 1 FROM Categoria x WHERE x.idLoja = l.idLoja
);
 
-- Conferir:
-- SELECT idLoja, idCategoria, nome, icone FROM Categoria ORDER BY idLoja, nome;
 
-- ------------------------------------------------------------
-- No seu arquivo de schema (para bancos novos), a tabela fica:
--
-- CREATE TABLE IF NOT EXISTS Categoria (
--     idCategoria INT AUTO_INCREMENT PRIMARY KEY,
--     idLoja INT NOT NULL,
--     nome VARCHAR(100) NOT NULL,
--     icone VARCHAR(30) NOT NULL DEFAULT 'shirt',
--     descricao VARCHAR(255),
--     ...
-- );
-- ------------------------------------------------------------
 

 -- 1. Tabela Categoria (Unificada e com a coluna icone)
CREATE TABLE IF NOT EXISTS Categoria (
    idCategoria INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    icone VARCHAR(255) NULL -- Adicionada a coluna de ícone
) ENGINE=InnoDB;

-- 2. Tabela Produto (Exemplo de referência para as chaves estrangeiras)
CREATE TABLE IF NOT EXISTS Produto (
    idProduto INT AUTO_INCREMENT PRIMARY KEY,
    idCategoria INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    CONSTRAINT fk_produto_categoria 
        FOREIGN KEY (idCategoria) REFERENCES Categoria(idCategoria)
        ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3. Tabela VariacaoProduto (Atualizada com atributos, preço e estoque)
CREATE TABLE IF NOT EXISTS VariacaoProduto (
    idVariacao INT AUTO_INCREMENT,
    idProduto INT NOT NULL,
    atributos JSON NULL,                      -- Ex: {"Cor":"Azul","Tamanho":"M"}
    preco DECIMAL(10,2) NOT NULL DEFAULT 0,
    estoque INT NOT NULL DEFAULT 0,
    PRIMARY KEY (idVariacao, idProduto),
    CONSTRAINT fk_variacao_produto 
        FOREIGN KEY (idProduto) REFERENCES Produto(idProduto)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 4. Tabela ImagemProduto (Nova tabela de imagens vinculadas a produtos/variações)
CREATE TABLE IF NOT EXISTS ImagemProduto (
    idImagem INT AUTO_INCREMENT PRIMARY KEY,
    idProduto INT NOT NULL,
    idVariacao INT NULL,                      -- NULL = imagem geral do produto
    caminho VARCHAR(255) NOT NULL,
    corFundo VARCHAR(10),
    principal BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_imagem_produto
        FOREIGN KEY (idProduto) REFERENCES Produto(idProduto)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_imagem_variacao
        FOREIGN KEY (idVariacao, idProduto)
        REFERENCES VariacaoProduto(idVariacao, idProduto)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;