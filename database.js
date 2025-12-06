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
        // --- TABELA RDC (Registro Diário de Contrato) ---
        // NOTA: Esta tabela armazena os dados principais e os dados dos filhos (Serviços, HH e PIN)
        // serializados como JSON em campos TEXT.
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS rdc (
                id INTEGER PRIMARY KEY NOT NULL,
                
                -- Campos principais do RDC
                data DATE,
                local TEXT,
                tipo TEXT,
                doc TEXT, -- Armazena o path/url do documento
                disciplina TEXT,
                obs TEXT,
                aprovado INTEGER DEFAULT 0, -- Booleano como INTEGER (0 ou 1)
                encarregado TEXT,
                clima TEXT,
                inicio TIME,
                termino TIME,
                
                -- Chaves Estrangeiras (Armazenando o ID do Servidor)
                unidade_server_id INTEGER,
                solicitante_server_id INTEGER,
                aprovador_server_id INTEGER,
                AS_server_id INTEGER,
                projeto_cod_server_id INTEGER,
                bm_server_id INTEGER,
                
                -- Campos JSON para os ITENS FILHOS ANINHADOS
                -- Os arrays de ServicoRdc, ItemMedicaohh e ItemMedicaoPin são armazenados aqui como JSON strings.
                servicos_json TEXT, 
                hh_json TEXT, 
                pin_json TEXT, 

                -- Campos de Sincronização
                server_id INTEGER UNIQUE,
                sync_status TEXT DEFAULT 'synced', -- synced, pending, failed
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
            );
        `);
        await database.execAsync(`
                CREATE TABLE IF NOT EXISTS levantamento (
                    id INTEGER PRIMARY KEY NOT NULL,
                    
                    -- Campos principais do Levantamento (Django Model: Levantamento)
                    data DATE,
                    escopo TEXT, -- Escopo do serviço
                    local TEXT,  -- Local do serviço
                    doc TEXT,    -- Armazena o path/url do documento
                    
                    -- Chaves Estrangeiras (Armazenando o ID do Servidor)
                    -- auth_serv (AS)
                    auth_serv_server_id INTEGER, 
                    -- unidade (Area)
                    unidade_server_id INTEGER,
                    -- projeto_cod (ProjetoCodigo)
                    projeto_cod_server_id INTEGER,
                    
                    -- Campo JSON para os ITENS FILHOS ANINHADOS
                    -- O array de ItemLevantamentoPintura é armazenado aqui como JSON string.
                    itens_pintura_json TEXT, 

                    -- Campos de Sincronização
                    server_id INTEGER UNIQUE,
                    sync_status TEXT DEFAULT 'synced', -- synced, pending, deleted, failed
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP 
                );
            `);
        await database.execAsync(`
                CREATE TABLE IF NOT EXISTS boletim_medicoes (
                    id INTEGER PRIMARY KEY NOT NULL,
                    
                    -- Campos de Chave Estrangeira (FKs)
                    unidade_id INTEGER,
                    unidade_server_id INTEGER,
                    projeto_cod_id INTEGER,
                    projeto_cod_server_id INTEGER,
                    d_aprovador_id INTEGER,
                    d_aprovador_server_id INTEGER,
                    b_aprovador_id INTEGER,
                    b_aprovador_server_id INTEGER,

                    -- Campos de Dados
                    periodo_inicio DATE NOT NULL,
                    periodo_fim DATE NOT NULL,
                    status_pgt TEXT,
                    status_med TEXT,
                    d_numero TEXT,
                    d_data DATE,
                    d_status TEXT,
                    b_numero TEXT,
                    b_data DATE,
                    b_status TEXT,
                    descricao TEXT NOT NULL,
                    valor REAL,
                    follow_up TEXT,
                    rev INTEGER,
                    
                    -- Campos de Sincronização
                    server_id INTEGER UNIQUE,
                    sync_status TEXT DEFAULT 'synced',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                    
                    -- FKs Locais (opcional, mas bom para integridade local)
                    FOREIGN KEY (unidade_id) REFERENCES areas(id) ON DELETE SET NULL,
                    FOREIGN KEY (projeto_cod_id) REFERENCES projetos_codigos(id) ON DELETE SET NULL,
                    FOREIGN KEY (d_aprovador_id) REFERENCES aprovadores(id) ON DELETE SET NULL,
                    FOREIGN KEY (b_aprovador_id) REFERENCES aprovadores(id) ON DELETE SET NULL
                );
            `);
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS ass (
                id INTEGER PRIMARY KEY NOT NULL,

                -- Campos de Chave Estrangeira (FKs)
                unidade_id INTEGER,
                unidade_server_id INTEGER,
                solicitante_id INTEGER,
                solicitante_server_id INTEGER,
                aprovador_id INTEGER,
                aprovador_server_id INTEGER,
                projeto_cod_id INTEGER,
                projeto_cod_server_id INTEGER,
                
                -- Campos de Dados
                data DATE NOT NULL,
                status_as TEXT,
                tipo TEXT NOT NULL,
                disciplina TEXT NOT NULL,
                escopo TEXT,
                local TEXT,
                obs TEXT,
                rev INTEGER,
                as_sap TEXT,
                as_antiga TEXT,

                -- Campos de Sincronização
                server_id INTEGER UNIQUE,
                sync_status TEXT DEFAULT 'synced',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
                
                -- FKs Locais (opcional)
                FOREIGN KEY (unidade_id) REFERENCES areas(id) ON DELETE SET NULL,
                FOREIGN KEY (solicitante_id) REFERENCES solicitantes(id) ON DELETE CASCADE,
                FOREIGN KEY (aprovador_id) REFERENCES aprovadores(id) ON DELETE SET NULL,
                FOREIGN KEY (projeto_cod_id) REFERENCES projetos_codigos(id) ON DELETE SET NULL
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


        // Tabela relatorios 
        await database.execAsync(`
    CREATE TABLE IF NOT EXISTS relatorios (
        id INTEGER PRIMARY KEY,
        cliente TEXT,
        data TEXT,
        rec TEXT,
        nota TEXT,
        tag TEXT,
        tipo_serv TEXT,
        unidade_id INTEGER, 
        contrato_id INTEGER,
        setor TEXT,
        corrosividade TEXT,
        fiscal TEXT,
        inspetor TEXT,
        inicio TEXT,
        termino TEXT,
        tratamento TEXT,
        tipo_subs TEXT,
        temp_ambiente TEXT,
        ura TEXT,
        po TEXT,
        temp_super TEXT,
        intemperismo TEXT,
        descontaminacao TEXT,
        poeira_tam TEXT,
        poeira_quant TEXT,
        teor_sais TEXT,
        ambiente_pintura TEXT,
        rugosidade TEXT,
        laudo INTEGER,
        rnc_n INTEGER,
        obs_inst TEXT,
        obs_final TEXT,
        aprovado INTEGER,
        m2 REAL,
        checklist_n_id INTEGER,
        sync_status TEXT DEFAULT 'pending',
        server_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unidade_id) REFERENCES areas(id) ON DELETE SET NULL,
        FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE SET NULL
    );
`);

        // Tabela etapas_pintura 
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS etapas_pintura (
                id INTEGER PRIMARY KEY,
                rip_n_id INTEGER,
                tinta TEXT,
                lote_a TEXT,
                val_a TEXT,
                lote_b TEXT,
                val_b TEXT,
                lote_c TEXT,
                val_c TEXT,
                cor_munsell TEXT,
                temp_amb TEXT,
                ura TEXT,
                po TEXT,
                temp_substrato TEXT,
                diluente TEXT,
                met_aplic TEXT,
                inicio TEXT,
                termino TEXT,
                inter_repintura TEXT,
                epe TEXT,
                eps TEXT,
                insp_visual TEXT,
                aderencia TEXT,
                holiday TEXT,
                laudo TEXT,
                data_insp TEXT,
                pintor TEXT,
                sync_status TEXT DEFAULT 'pending',
                server_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (rip_n_id) REFERENCES relatorios(id) ON DELETE CASCADE
            );
        `);

        // Tabela photos 
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS photos (
                id INTEGER PRIMARY KEY,
                rip_numero_id INTEGER,
                photo_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                server_id INTEGER,
                FOREIGN KEY (rip_numero_id) REFERENCES relatorios(id) ON DELETE CASCADE
            );
        `);

        // Tabela checklists 
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS checklists (
                id INTEGER PRIMARY KEY,
                cliente TEXT,
                tag TEXT,
                unidade_id INTEGER,
                data TEXT,
                rec TEXT,
                nota TEXT,
                setor TEXT,
                tipo_serv TEXT,
                m2 REAL,
                esquema_pintura TEXT,
                tratamento TEXT,
                laudo INTEGER,
                rnc_n INTEGER,
                obs_final TEXT,
                aprovado INTEGER,
                calha_utec TEXT,
                guia_pc TEXT,
                fita_protec TEXT,
                trecho_rec TEXT,
                elastomero TEXT,
                volante_caps TEXT,
                doc TEXT,
                sync_status TEXT DEFAULT 'pending',
                server_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (unidade_id) REFERENCES areas(id) ON DELETE SET NULL
            );
        `);

        // Tabela checklist_etapas 
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS checklist_etapas (
                id INTEGER PRIMARY KEY,
                check_n_id INTEGER,
                data_inicio TEXT,
                inicio TEXT,
                termino TEXT,
                tipo_substrato TEXT,
                tinta TEXT,
                cor_munsell TEXT,
                lote_a TEXT,
                lote_b TEXT,
                lote_c TEXT,
                fabricante TEXT,
                data_final TEXT,
                sync_status TEXT DEFAULT 'pending',
                server_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (check_n_id) REFERENCES checklists(id) ON DELETE CASCADE
            );
        `);

        // Tabela checklist_colaboradores 
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS checklist_colaboradores (
                id INTEGER PRIMARY KEY,
                check_n_id INTEGER,
                colaborador_id INTEGER,
                sync_status TEXT DEFAULT 'pending',
                server_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (check_n_id) REFERENCES checklists(id) ON DELETE CASCADE,
                FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE
            );
        `);

        // Tabela checklist_fotos 
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS checklist_fotos (
                id INTEGER PRIMARY KEY,
                checklist_numero_id INTEGER,
                photo TEXT,
                latitude REAL,
                longitude REAL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                server_id INTEGER,
                FOREIGN KEY (checklist_numero_id) REFERENCES checklists(id) ON DELETE CASCADE
            );
        `);

        // Tabela relatorios_garantia 
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS relatorios_garantia (
                id INTEGER PRIMARY KEY,
                data TEXT,
                unidade_id INTEGER,
                rec TEXT,
                nota TEXT,
                setor TEXT,
                descricao_serv TEXT,
                esquema_pintura TEXT,
                ce TEXT,
                pintura_inicial_id INTEGER,
                pintura_inicial_aprov TEXT,
                retoq_pintura TEXT,
                retoq_pintura_aprov TEXT,
                repintura_parcial TEXT,
                repintura_parcial_aprov TEXT,
                m2 REAL,
                recomendacao INTEGER,
                obs TEXT,
                recomendacao_ok INTEGER,
                data_recomendacao TEXT,
                sync_status TEXT DEFAULT 'pending',
                server_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (unidade_id) REFERENCES areas(id) ON DELETE SET NULL,
                FOREIGN KEY (pintura_inicial_id) REFERENCES relatorios(id) ON DELETE CASCADE
            );
        `);

        // Tabela recomendacoes_garantia 
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS recomendacoes_garantia (
                id INTEGER PRIMARY KEY,
                rel_garantia_id INTEGER,
                recomendacao TEXT,
                braskem REAL,
                parceira REAL,
                sync_status TEXT DEFAULT 'pending',
                server_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (rel_garantia_id) REFERENCES relatorios_garantia(id) ON DELETE CASCADE
            );
        `);

        // Tabela photos_garantia 
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS photos_garantia (
                id INTEGER PRIMARY KEY,
                garantia_numero_id INTEGER,
                photo_path TEXT,
                sync_status TEXT DEFAULT 'pending',
                server_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (garantia_numero_id) REFERENCES relatorios_garantia(id) ON DELETE CASCADE
            );
        `);

        // As tabelas a seguir não foram encontradas no backend, mas mantidas por segurança.
        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS medicoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT,
                unidade TEXT,
                cip TEXT,
                valor TEXT,
                aprovador TEXT,
                bmNumber TEXT,
                bms TEXT,
                dms TEXT,
                statusPgt TEXT,
                statusMed TEXT,
                revisao TEXT,
                dmsNumero TEXT,
                dmsData TEXT,
                dmsAprovador TEXT,
                dmsStatus TEXT,
                bmsNumero TEXT,
                bmsData TEXT,
                bmsAprovador TEXT,
                bmsStatus TEXT,
                descricao TEXT,
                followUp TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS apontamentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                data TEXT,
                area INTEGER,
                disciplina TEXT CHECK(disciplina IN ('AND', 'PIN', 'ISO')),
                projeto INTEGER,
                observacoes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending',
                FOREIGN KEY (area) REFERENCES areas(id)
            );
        `);

        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS efetivos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                apontamento_id INTEGER,
                colaborador INTEGER,
                status TEXT CHECK(status IN ('PRESENTE', 'FALTA', 'FÉRIAS', 'EXAMES', 'TREINAMENTO')),
                lider TEXT CHECK(lider IN ('0', '1')),
                sync_status TEXT DEFAULT 'pending',
                FOREIGN KEY (apontamento_id) REFERENCES apontamentos(id) ON DELETE CASCADE,
                FOREIGN KEY (colaborador) REFERENCES colaboradores(id)
            );
        `);

        await database.execAsync(`
            CREATE TABLE IF NOT EXISTS projetos (
                id INTEGER PRIMARY KEY,
                projeto_nome TEXT,
                codigo_exibicao TEXT,
                contrato TEXT,
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