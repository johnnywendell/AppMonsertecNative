import * as SQLite from 'expo-sqlite';

// Configuração para expo-sqlite v15.2.12
let db = null;
let isInitialized = false;

// Função para inicializar o banco de forma assíncrona
export async function initDatabase() {
    if (isInitialized && db) {
        try {
            // Verificar se o banco ainda está acessível
            // Usamos o método getFirstAsync do objeto db (que é o padrão da nova API)
            await db.getFirstAsync('SELECT 1 as test');
            return db;
        } catch (error) {
            console.warn('Banco de dados existente não está acessível, reinicializando...', error);
            isInitialized = false;
            db = null;
        }
    }

    try {
        console.log('Inicializando banco de dados SQLite v15...');
        db = await SQLite.openDatabaseAsync('monsertec.db', {
            useNewConnection: true // Garante uma nova conexão
        });
        isInitialized = true;
        console.log('Banco de dados SQLite inicializado com sucesso');
        return db;
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        isInitialized = false;
        db = null;
        throw error;
    }
}

// Função para obter instância do banco
export async function getDb() {
    if (!db || !isInitialized) {
        await initDatabase();
        await setupDatabase(); // Garantir que as tabelas estejam criadas
    }
    return db;
}

// ----------------------------------------------------
// --- FUNÇÕES WRAPPER (Adicionadas para facilitar o serviço e resolver o TypeError) ---
// ----------------------------------------------------

/**
 * Wrapper para comandos SQL que não retornam dados (INSERT, UPDATE, DELETE, CREATE).
 * @param {string} sql - A string SQL.
 * @param {Array<any>} params - Parâmetros para a query.
 * @returns {Promise<SQLite.SQLResultSet>}
 */
async function runAsync(sql, params = []) {
    const dbInstance = await getDb();
    return dbInstance.runAsync(sql, params);
}

/**
 * Wrapper para comandos SQL que retornam múltiplos dados (SELECT).
 * @param {string} sql - A string SQL.
 * @param {Array<any>} params - Parâmetros para a query.
 * @returns {Promise<Array<object>>}
 */
async function getAllAsync(sql, params = []) {
    const dbInstance = await getDb();
    return dbInstance.getAllAsync(sql, params); 
}

/**
 * Wrapper para comandos SQL que retornam um único dado (SELECT LIMIT 1).
 * @param {string} sql - A string SQL.
 * @param {Array<any>} params - Parâmetros para a query.
 * @returns {Promise<object | null>}
 */
async function getFirstAsync(sql, params = []) {
    const dbInstance = await getDb();
    return dbInstance.getFirstAsync(sql, params);
}


// ----------------------------------------------------
// --- CONFIGURAÇÃO DE TABELAS (setupDatabase) ---
// ----------------------------------------------------

// Função para configurar as tabelas
export async function setupDatabase() {
    try {
        console.log('Configurando tabelas do banco...');
        const database = await initDatabase();

        // Habilitar journal_mode WAL para melhor desempenho
        await database.execAsync('PRAGMA journal_mode = WAL;');

        // --- TABELA CONTRATOS ---
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS contratos (
                id INTEGER PRIMARY KEY
            );
        `);
        // --- Tnovo testte---
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS offline_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,

                entity TEXT NOT NULL,
                operation TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                payload TEXT NOT NULL,

                attempts INTEGER DEFAULT 0,
                last_error TEXT,

                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // --- TABELA ÁREAS (AJUSTADA: Adicionado UNIQUE e timestamps) ---
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS areas (
                id INTEGER PRIMARY KEY NOT NULL,
                area TEXT NOT NULL UNIQUE,
                contrato_id INTEGER,
                contrato_server_id INTEGER, -- AGORA EXISTE!
                server_id INTEGER UNIQUE,
                sync_status TEXT DEFAULT 'synced',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL
            );
        `);
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS projeto_codigos (
                id INTEGER PRIMARY KEY NOT NULL,
                projeto_nome TEXT NOT NULL, 
                contrato_id INTEGER,
                contrato_server_id INTEGER, 
                server_id INTEGER UNIQUE,
                sync_status TEXT DEFAULT 'synced',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL
            );
        `);
        // --- TABELA SOLICITANTES (NOVA) ---
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS solicitantes (
                id INTEGER PRIMARY KEY NOT NULL,
                solicitante TEXT NOT NULL UNIQUE, -- Nome do solicitante, deve ser único
                contrato_id INTEGER,
                contrato_server_id INTEGER, -- ID do Contrato no servidor (para referência)
                server_id INTEGER UNIQUE,
                sync_status TEXT DEFAULT 'synced',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL
            );
        `);
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS aprovadores (
                id INTEGER PRIMARY KEY NOT NULL,
                aprovador TEXT NOT NULL UNIQUE,
                contrato_id INTEGER,
                contrato_server_id INTEGER,
                server_id INTEGER UNIQUE,
                sync_status TEXT DEFAULT 'synced',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL
            );
        `);
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS itens_bm (
                id INTEGER PRIMARY KEY NOT NULL,
                item_ref TEXT NOT NULL,
                disciplina TEXT NOT NULL,
                descricao TEXT NOT NULL,
                und TEXT NOT NULL,
                preco_item REAL NOT NULL,
                obs TEXT,
                data TEXT NOT NULL,
                contrato_id INTEGER,
                contrato_server_id INTEGER,
                server_id INTEGER UNIQUE,
                sync_status TEXT DEFAULT 'synced',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                
                -- Garante que o item_ref é único para um dado contrato, refletindo o Django
                UNIQUE (item_ref, contrato_server_id), 

                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL
            );
        `);
        
        // --- TABELA COLABORADORES (AJUSTADA: Adicionado created_at) ---
        await db.execAsync(`
            CREATE TABLE IF NOT EXISTS colaboradores (
                id INTEGER PRIMARY KEY NOT NULL,
                server_id INTEGER UNIQUE,      
                nome TEXT NOT NULL,
                matricula TEXT UNIQUE NOT NULL,
                funcao TEXT,
                disciplina TEXT,
                ativo TEXT DEFAULT '1',
                sync_status TEXT DEFAULT 'synced',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Adicionado para completude do modelo
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

    

        console.log('Tabelas do banco configuradas com sucesso');
        return database;
    } catch (error) {
        console.error('Erro ao configurar tabelas:', error);
        throw error;
    }
}

// Função para fechar o banco
export async function closeDatabase() {
    if (db && isInitialized) {
        try {
            await db.closeAsync();
            db = null;
            isInitialized = false;
            console.log('Banco de dados fechado com sucesso');
        } catch (error) {
            console.error('Erro ao fechar banco:', error);
        }
    }
}

// Função para verificar saúde do banco
export async function checkDatabaseHealth() {
    try {
        const database = await getDb();
        const result = await database.getFirstAsync('SELECT 1 as test');
        return result && result.test === 1;
    } catch (error) {
        console.error('Erro na verificação de saúde do banco:', error);
        return false;
    }
}

export async function resetDatabase() {
    try {
        await closeDatabase();
        // A API moderna do expo-sqlite v15 usa deleteDatabaseAsync no nome do arquivo
        await SQLite.deleteDatabaseAsync('monsertec.db'); 
        console.log('Banco de dados deletado com sucesso');
        await initDatabase();
        await setupDatabase();
        console.log('Banco de dados reinicializado com sucesso');
    } catch (error) {
        console.error('Erro ao resetar banco de dados:', error);
        throw error;
    }
}

// =========================================================
// EXPORTAÇÕES DE FUNÇÕES WRAPPER
// (Permite que os serviços usem runAsync, getAllAsync, etc., resolvendo o TypeError)
// =========================================================
export { runAsync, getAllAsync, getFirstAsync };