import { getDb, runAsync, getAllAsync, getFirstAsync } from '../database';
import { syncProjetoCodigos } from './syncService'; // Função que acabamos de criar

// Nome da tabela SQLite para ProjetoCodigo
const TABLE_NAME = 'projeto_codigos';

/**
 * Insere ou atualiza um Código de Projeto localmente e marca para sincronização.
 * @param {object} dados - { id (opcional), projeto_nome, contrato_server_id }
 */
export const salvarProjetoCodigoLocal = async (dados) => {
    const db = await getDb();
    const { id, projeto_nome, contrato_server_id } = dados;
    let result;

    if (!projeto_nome || !contrato_server_id) {
        throw new Error("Nome do Projeto e ID do Contrato são obrigatórios.");
    }
    
    const payload = [
        projeto_nome, 
        contrato_server_id,
        'pending' // Status para sincronização
    ];

    if (id) {
        // --- ATUALIZAÇÃO ---
        result = await db.runAsync(
            `UPDATE ${TABLE_NAME}
             SET projeto_nome=?, contrato_server_id=?, sync_status=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            // O slice aqui garante que o 'updated_at' seja CURRENT_TIMESTAMP e que o status 'pending' seja o último parâmetro antes do ID
            [...payload.slice(0, 2), 'pending', id] 
        );
        console.log(`Código de Projeto local ID ${id} atualizado. Status: pending.`);
        
        return { ...dados, sync_status: 'pending' };

    } else {
        // --- CRIAÇÃO ---
        result = await db.runAsync(
            `INSERT INTO ${TABLE_NAME} (projeto_nome, contrato_server_id, sync_status)
             VALUES (?, ?, ?)`,
            payload
        );
        console.log(`Código de Projeto local criado com ID: ${result.lastInsertRowId}. Status: pending.`);
        
        return { ...dados, id: result.lastInsertRowId, sync_status: 'pending' };
    }
};

/**
 * Lista todos os Códigos de Projeto (Offline-First).
 * 1. Lê primeiro do SQLite.
 * 2. Tenta sincronizar com servidor em background (syncProjetoCodigos).
 */
export const listarProjetoCodigos = async () => {
    try {
        // 1. Leitura local
        const lista = await getAllAsync(
            `SELECT * FROM ${TABLE_NAME}` 
        );

        // Ordenação pelo nome do projeto
        const listaOrdenada = lista.sort((a, b) => a.projeto_nome.localeCompare(b.projeto_nome));

        // 2. Sincronização em background
        syncProjetoCodigos().catch((e) => console.warn("Sync de Códigos de Projeto em background falhou:", e.message));

        return listaOrdenada;

    } catch (error) {
        console.error("Erro ao listar Códigos de Projeto localmente:", error);
        throw error;
    }
};

/**
 * Busca um Código de Projeto por ID local.
 */
export const buscarProjetoCodigo = async (id) => {
    return await getFirstAsync(
        `SELECT * FROM ${TABLE_NAME} WHERE id=?`,
        [id]
    );
};