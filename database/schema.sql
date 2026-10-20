-- ============================================================
-- TCC - EasyStore: Plataforma Web Editável de E-commerce
-- Banco de dados: tcc_gestao_loja
-- SGBD: MySQL 8.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS tcc_gestao_loja
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE tcc_gestao_loja;

SET NAMES utf8mb4;

-- -----------------------------------------------------------
-- 1. LOJA
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS Loja (
    idLoja INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    urlLogo VARCHAR(255)
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 2. CATEGORIA - Cada categoria pertence a uma loja.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Categoria (
    idCategoria INT AUTO_INCREMENT PRIMARY KEY,
    idLoja INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),

    UNIQUE (idCategoria, idLoja),
    UNIQUE (idLoja, nome),

    CONSTRAINT fk_categoria_loja
        FOREIGN KEY (idLoja)
        REFERENCES Loja(idLoja)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 3. CLIENTE
-- -------------------------------------------------------------   
CREATE TABLE IF NOT EXISTS Cliente (
    idCliente INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    telefone VARCHAR(20),
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- 4. CONFIGURACAOLOJA - Informações da empresa/endereço/contato.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ConfiguracaoLoja (
    idConfiguracao INT AUTO_INCREMENT PRIMARY KEY,
    idLoja INT NOT NULL UNIQUE,
    nomeLoja VARCHAR(150) NOT NULL,
    descricao TEXT,
    enderecoCep VARCHAR(9),
    rua VARCHAR(150),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(50),
    numero VARCHAR(20),
    diaFunc VARCHAR(100),
    horario VARCHAR(100),
    whatsapp VARCHAR(20),
    instagram VARCHAR(150),
    email VARCHAR(150),

    CONSTRAINT fk_configuracao_loja
        FOREIGN KEY (idLoja)
        REFERENCES Loja(idLoja)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------   
-- 5. PERSONALIZACAOLOJA - Aparência visual da loja.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS PersonalizacaoLoja (
    idPersonalizacao INT AUTO_INCREMENT PRIMARY KEY,
    idLoja INT NOT NULL UNIQUE,
    corPrimaria VARCHAR(30),
    corSecundaria VARCHAR(30),
    fonte VARCHAR(100),
    banner VARCHAR(255),
    logo VARCHAR(255),

    CONSTRAINT fk_personalizacao_loja
        FOREIGN KEY (idLoja)
        REFERENCES Loja(idLoja)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- 6. PRODUTO - Cada produto pertence a uma loja e a uma categoria.
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Produto (
    idProduto INT AUTO_INCREMENT PRIMARY KEY,
    idLoja INT NOT NULL,
    idCategoria INT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    valorBase DECIMAL(10,2) NOT NULL,
    codigoSKU VARCHAR(50) NOT NULL,
    estoque INT NOT NULL DEFAULT 0,
    imagem VARCHAR(255),
    possuiVariacoes BOOLEAN NOT NULL DEFAULT FALSE,

    UNIQUE (idProduto, idLoja),
    UNIQUE (idLoja, codigoSKU),

    CONSTRAINT fk_produto_loja
        FOREIGN KEY (idLoja)
        REFERENCES Loja(idLoja)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_produto_categoria_loja
        FOREIGN KEY (idCategoria, idLoja)
        REFERENCES Categoria(idCategoria, idLoja)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_produto_valor
        CHECK (valorBase >= 0),

    CONSTRAINT chk_produto_estoque
        CHECK (estoque >= 0)
) ENGINE=InnoDB;

-- ------------------------------------------------------------------
-- 7. VARIACAOPRODUTO - Uma variação pertence a um único produto.
-- Ex.: Camiseta -> P, M, G.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS VariacaoProduto (
    idVariacao INT AUTO_INCREMENT PRIMARY KEY,
    idProduto INT NOT NULL,
    nomeVariacao VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    codigoSKU VARCHAR(50),

    UNIQUE (idVariacao, idProduto),
    UNIQUE (idProduto, codigoSKU),

    CONSTRAINT fk_variacao_produto
        FOREIGN KEY (idProduto)
        REFERENCES Produto(idProduto)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------------
-- 8. CARRINHO - Um cliente possui no máximo um carrinho por loja.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Carrinho (
    idCarrinho INT AUTO_INCREMENT PRIMARY KEY,
    idCliente INT NOT NULL,
    idLoja INT NOT NULL,
    valorTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    UNIQUE (idCliente, idLoja),

    CONSTRAINT fk_carrinho_cliente
        FOREIGN KEY (idCliente)
        REFERENCES Cliente(idCliente)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_carrinho_loja
        FOREIGN KEY (idLoja)
        REFERENCES Loja(idLoja)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT chk_carrinho_valor
        CHECK (valorTotal >= 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- 9. ITEMCARRINHO
-- idVariacao é opcional:
-- NULL = produto sem variação.
-- Preenchido = variação específica escolhida.
-- A FK composta garante que a variação pertence ao produto.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ItemCarrinho (
    idItemCarrinho INT AUTO_INCREMENT PRIMARY KEY,
    idCarrinho INT NOT NULL,
    idProduto INT NOT NULL,
    idVariacao INT NULL,
    quantidade INT NOT NULL,
    precoUnitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_item_carrinho
        FOREIGN KEY (idCarrinho)
        REFERENCES Carrinho(idCarrinho)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_item_carrinho_produto
        FOREIGN KEY (idProduto)
        REFERENCES Produto(idProduto)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_item_carrinho_variacao
        FOREIGN KEY (idVariacao, idProduto)
        REFERENCES VariacaoProduto(idVariacao, idProduto)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_item_carrinho_quantidade
        CHECK (quantidade > 0),

    CONSTRAINT chk_item_carrinho_preco
        CHECK (precoUnitario >= 0),

    CONSTRAINT chk_item_carrinho_subtotal
        CHECK (subtotal >= 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- 10. PEDIDO - O pedido pertence a um cliente e a uma loja.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS Pedido (
    idPedido INT AUTO_INCREMENT PRIMARY KEY,
    idCliente INT NOT NULL,
    idLoja INT NOT NULL,
    dataPedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendente',
    valorTotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT fk_pedido_cliente
        FOREIGN KEY (idCliente)
        REFERENCES Cliente(idCliente)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_pedido_loja
        FOREIGN KEY (idLoja)
        REFERENCES Loja(idLoja)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_pedido_valor
        CHECK (valorTotal >= 0)
) ENGINE=InnoDB;

-- -----------------------------------------------------------   
-- 11. ITEMPEDIDO
-- idVariacao é opcional:
-- NULL = produto sem variação.
-- Preenchido = variação específica comprada.
-- O preço fica registrado para preservar o valor da compra.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS ItemPedido (
    idItemPedido INT AUTO_INCREMENT PRIMARY KEY,
    idPedido INT NOT NULL,
    idProduto INT NOT NULL,
    idVariacao INT NULL,
    quantidade INT NOT NULL,
    precoUnitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_item_pedido
        FOREIGN KEY (idPedido)
        REFERENCES Pedido(idPedido)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_item_pedido_produto
        FOREIGN KEY (idProduto)
        REFERENCES Produto(idProduto)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_item_pedido_variacao
        FOREIGN KEY (idVariacao, idProduto)
        REFERENCES VariacaoProduto(idVariacao, idProduto)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT chk_item_pedido_quantidade
        CHECK (quantidade > 0),

    CONSTRAINT chk_item_pedido_preco
        CHECK (precoUnitario >= 0),

    CONSTRAINT chk_item_pedido_subtotal
        CHECK (subtotal >= 0)
) ENGINE=InnoDB;

