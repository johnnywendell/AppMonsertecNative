import { api } from './api';
// Importa as funções wrapper diretamente do database.js
import { runAsync, getAllAsync, getFirstAsync } from '../database'; 
import { syncColaboradores } from './syncService'; // Importar para sync em background



/**
 * Insere ou atualiza um colaborador localmente e marca para sincronização.
 * @param {object} dados - Objeto do colaborador. Inclui id (opcional), nome, matricula, funcao, disciplina, ativo.
 */
export const salvarColaboradorLocal = async (dados) => {
    // Usamos as funções wrapper diretamente
    const { id, nome, matricula, funcao, disciplina, ativo, server_id } = dados; 
    let result;

    const payload = [
        nome, 
        matricula, 
        funcao, 
        disciplina, 
        ativo || '1', // Default para '1' (SIM)
        'pending'
    ];

    if (id) {
        // --- ATUALIZAÇÃO ---
        // Adicionando o 'id' local ao final do payload para o WHERE
        result = await runAsync(
            `UPDATE colaboradores
             SET nome=?, matricula=?, funcao=?, disciplina=?, ativo=?, sync_status=?, updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [...payload.slice(0, -1), id] // [nome, matricula, ..., ativo, id]
        );
        
        console.log(`Colaborador local ID ${id} atualizado. Status: pending.`);
        
        // Retorna o objeto atualizado (incluindo o ID local original e server_id)
        return { ...dados, sync_status: 'pending' };

    } else {
        // --- CRIAÇÃO ---
        result = await runAsync(
            `INSERT INTO colaboradores (nome, matricula, funcao, disciplina, ativo, sync_status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            payload
        );
        console.log(`Colaborador local criado com ID: ${result.lastInsertRowId}. Status: pending.`);
        
        // Retorna o objeto criado com o ID local
        return { ...dados, id: result.lastInsertRowId, sync_status: 'pending' };
    }
};

/**
 * Listar colaboradores (Offline-First)
 * 1. Lê primeiro do SQLite (rápido).
 * 2. Tenta sincronizar com servidor em background.
 */
export const listarColaboradores = async () => {
    try {
        // Uso direto da função wrapper getAllAsync
        const lista = await getAllAsync(
            "SELECT * FROM colaboradores ORDER BY nome ASC"
        );

        // Inicia sincronização em background para garantir dados atualizados, sem travar a UI
        syncColaboradores().catch((e) => console.warn("Sync de colaboradores em background falhou:", e.message));

        return lista;

    } catch (error) {
        console.error("Erro ao listar colaboradores localmente:", error);
        throw error;
    }
};

/**
 * Busca um colaborador por ID local.
 * @param {number} id - ID local do colaborador.
 */
export const buscarColaborador = async (id) => {
    // Uso direto da função wrapper getFirstAsync
    return await getFirstAsync(
        "SELECT * FROM colaboradores WHERE id=?",
        [id]
    );
};

/**
 * Exclui um colaborador localmente.
 * OBS: Se o colaborador tiver server_id, a sincronização deve lidar com a exclusão no servidor.
 * @param {number} id - ID local do colaborador a ser excluído.
 */
export const excluirColaboradorLocal = async (id) => {
    try {
        const colaborador = await buscarColaborador(id);

        if (!colaborador) {
            console.log(`Colaborador com ID ${id} não encontrado para exclusão.`);
            return { success: false, message: "Colaborador não encontrado." };
        }
        
        if (colaborador.server_id) {
            // Se possui server_id, marca como 'deleted' e dispara a sync
            await runAsync(
                `UPDATE colaboradores SET sync_status='deleted', updated_at=CURRENT_TIMESTAMP WHERE id=?`, 
                [id]
            );
            console.log(`Colaborador ID ${id} marcado como 'deleted'. Disparando sync.`);
            syncColaboradores().catch((e) => console.warn("Sync de exclusão em background falhou:", e.message));
        } else {
            // Se não tem server_id, é um registro local novo que pode ser deletado de vez
            await runAsync(`DELETE FROM colaboradores WHERE id=?`, [id]);
            console.log(`Colaborador ID ${id} localmente excluído permanentemente.`);
        }

        return { success: true };

    } catch (error) {
        console.error(`Erro ao excluir colaborador ID ${id}:`, error);
        throw error;
    }
};

// Se você precisar de uma função para salvar dados vindos do servidor
export const salvarColaboradorDoServidor = async (colaborador) => {
    const { server_id, nome, matricula, funcao, disciplina, ativo } = colaborador;

    // Tenta encontrar pelo server_id
    let localColaborador = await getFirstAsync(
        "SELECT id FROM colaboradores WHERE server_id = ?",
        [server_id]
    );

    if (localColaborador) {
        // Atualiza
        await runAsync(
            `UPDATE colaboradores
             SET nome=?, matricula=?, funcao=?, disciplina=?, ativo=?, server_id=?, sync_status='synced', updated_at=CURRENT_TIMESTAMP
             WHERE id=?`,
            [nome, matricula, funcao, disciplina, ativo || '1', server_id, localColaborador.id]
        );
        return localColaborador.id;
    } else {
        // Insere
        const result = await runAsync(
            `INSERT INTO colaboradores (server_id, nome, matricula, funcao, disciplina, ativo, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, 'synced')`,
            [server_id, nome, matricula, funcao, disciplina, ativo || '1']
        );
        return result.lastInsertRowId;
    }
};

// Função para buscar colaboradores pendentes de envio
export const buscarColaboradoresPendentes = async () => {
    return await getAllAsync(
        "SELECT * FROM colaboradores WHERE sync_status IN ('pending', 'deleted')"
    );
};