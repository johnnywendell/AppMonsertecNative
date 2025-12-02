import { getDb } from '../database';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache e configurações
let dbInstance = null;
const CACHE_KEY = '@medicoes_cache';
const CACHE_DURATION = 30000; // 30 segundos
let lastCacheTime = 0;
let cachedMedicoes = null;
let isLoadingMedicoes = false; // CORREÇÃO: Flag global para evitar múltiplas chamadas

// Função para obter instância do banco com retry
const getDbInstance = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            if (!dbInstance) {
                dbInstance = await getDb();
            }
            return dbInstance;
        } catch (error) {
            console.error(`Tentativa ${i + 1} de conectar ao banco falhou:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
};

// Função para limpar cache
const clearCache = () => {
    cachedMedicoes = null;
    lastCacheTime = 0;
    console.log('Cache de medições limpo');
};

// Função para salvar cache
const saveCache = async (data) => {
    try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        console.log('Cache salvo com sucesso');
    } catch (error) {
        console.error('Erro ao salvar cache:', error);
    }
};

// Função para carregar cache
const loadCache = async () => {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_DURATION) {
                console.log('Cache válido encontrado');
                return data;
            } else {
                console.log('Cache expirado');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar cache:', error);
    }
    return null;
};

// INSERIR MEDIÇÃO
export const inserirMedicao = async (medicao, callback) => {
    try {
        console.log('=== INSERINDO MEDIÇÃO ===');
        const db = await getDbInstance();
        
        if (!medicao || typeof medicao !== 'object') {
            throw new Error('Dados de medição inválidos');
        }

        const {
            data, unidade, cip, valor, aprovador, bmNumber, bms, dms,
            statusPgt, statusMed, revisao, dmsNumero, dmsData, dmsAprovador, dmsStatus,
            bmsNumero, bmsData, bmsAprovador, bmsStatus, descricao, followUp
        } = medicao;

        const result = await db.runAsync(
            `INSERT INTO medicoes (
                data, unidade, cip, valor, aprovador, bmNumber, bms, dms,
                statusPgt, statusMed, revisao, dmsNumero, dmsData, dmsAprovador, dmsStatus,
                bmsNumero, bmsData, bmsAprovador, bmsStatus, descricao, followUp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                data || '', unidade || '', cip || '', valor || '', aprovador || '', 
                bmNumber || '', bms || '', dms || '', statusPgt || '', statusMed || '', 
                revisao || '0', dmsNumero || '', dmsData || '', dmsAprovador || '', 
                dmsStatus || '', bmsNumero || '', bmsData || '', bmsAprovador || '', 
                bmsStatus || '', descricao || '', followUp || ''
            ]
        );

        console.log('Medição inserida com sucesso. ID:', result.lastInsertRowId);
        
        // Limpar cache após inserção
        clearCache();
        
        if (callback) {
            callback({ insertId: result.lastInsertRowId });
        }
        
        return { insertId: result.lastInsertRowId };
    } catch (error) {
        console.error('Erro ao inserir medição:', error);
        if (callback) {
            callback(null);
        }
        throw error;
    }
};

// LISTAR MEDIÇÕES - CORREÇÃO: Evitar múltiplas chamadas simultâneas
export const listarMedicoes = async () => {
    // CORREÇÃO: Evitar múltiplas chamadas simultâneas
    if (isLoadingMedicoes) {
        console.log('Já existe uma consulta em andamento, aguardando...');
        // Aguardar um pouco e tentar novamente
        await new Promise(resolve => setTimeout(resolve, 100));
        if (isLoadingMedicoes) {
            console.log('Ainda carregando, retornando cache se disponível');
            return cachedMedicoes || [];
        }
    }

    try {
        isLoadingMedicoes = true;
        console.log('=== LISTANDO MEDIÇÕES ===');
        
        // Verificar cache primeiro
        const now = Date.now();
        if (cachedMedicoes && (now - lastCacheTime) < CACHE_DURATION) {
            console.log('Retornando dados do cache em memória');
            return cachedMedicoes;
        }

        const cached = await loadCache();
        if (cached) {
            console.log('Retornando dados do cache AsyncStorage');
            cachedMedicoes = cached;
            lastCacheTime = now;
            return cached;
        }
        
        console.log('Cache não disponível, consultando banco...');
        const db = await getDbInstance();
        
        const result = await db.getAllAsync(
            `SELECT * FROM medicoes ORDER BY id DESC LIMIT 100`
        );
        
        console.log(`${result.length} medições carregadas do SQLite`);
        
        // Salvar no cache
        await saveCache(result);
        cachedMedicoes = result;
        lastCacheTime = now;
        
        return result || [];
    } catch (error) {
        console.error('Erro ao listar medições:', error);
        
        // Fallback para cache em caso de erro
        const cached = await loadCache();
        if (cached) {
            console.log('Usando cache como fallback após erro');
            return cached;
        }
        
        return [];
    } finally {
        isLoadingMedicoes = false;
    }
};

// BUSCAR MEDIÇÃO POR ID
export const buscarMedicaoPorId = async (id, callback) => {
    try {
        console.log('=== BUSCANDO MEDIÇÃO POR ID ===', id);
        
        if (!id) {
            throw new Error('ID inválido para busca');
        }

        const db = await getDbInstance();
        
        const result = await db.getFirstAsync(
            `SELECT * FROM medicoes WHERE id = ?`,
            [parseInt(id)]
        );

        console.log('Medição encontrada:', result ? 'Sim' : 'Não');
        
        if (callback) {
            callback(result || null);
        }
        
        return result || null;
    } catch (error) {
        console.error('Erro ao buscar medição por ID:', error);
        if (callback) {
            callback(null);
        }
        return null;
    }
};

// ATUALIZAR MEDIÇÃO
export const atualizarMedicao = async (id, medicao, callback) => {
    try {
        console.log('=== ATUALIZANDO MEDIÇÃO ===', id);
        
        if (!id || !medicao) {
            throw new Error('Dados inválidos para atualização');
        }

        const db = await getDbInstance();
        
        const {
            data, unidade, cip, valor, aprovador, bmNumber, bms, dms,
            statusPgt, statusMed, revisao, dmsNumero, dmsData, dmsAprovador, dmsStatus,
            bmsNumero, bmsData, bmsAprovador, bmsStatus, descricao, followUp
        } = medicao;

        const result = await db.runAsync(
            `UPDATE medicoes SET
                data = ?, unidade = ?, cip = ?, valor = ?, aprovador = ?, bmNumber = ?, bms = ?, dms = ?,
                statusPgt = ?, statusMed = ?, revisao = ?, dmsNumero = ?, dmsData = ?, dmsAprovador = ?, dmsStatus = ?,
                bmsNumero = ?, bmsData = ?, bmsAprovador = ?, bmsStatus = ?, descricao = ?, followUp = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
                data || '', unidade || '', cip || '', valor || '', aprovador || '', 
                bmNumber || '', bms || '', dms || '', statusPgt || '', statusMed || '', 
                revisao || '0', dmsNumero || '', dmsData || '', dmsAprovador || '', 
                dmsStatus || '', bmsNumero || '', bmsData || '', bmsAprovador || '', 
                bmsStatus || '', descricao || '', followUp || '', parseInt(id)
            ]
        );

        console.log('Medição atualizada. Linhas afetadas:', result.changes);
        
        // Limpar cache após atualização
        clearCache();
        
        if (callback) {
            callback({ rowsAffected: result.changes });
        }
        
        return { rowsAffected: result.changes };
    } catch (error) {
        console.error('Erro ao atualizar medição:', error);
        if (callback) {
            callback(null);
        }
        throw error;
    }
};

// FUNÇÃO DE DIAGNÓSTICO
export const diagnosticarBanco = async () => {
    try {
        console.log('=== DIAGNÓSTICO DO BANCO ===');
        const db = await getDbInstance();
        
        const tableExists = await db.getFirstAsync(
            `SELECT name FROM sqlite_master WHERE type='table' AND name='medicoes'`
        );
        
        const count = await db.getFirstAsync('SELECT COUNT(*) as count FROM medicoes');
        
        const schema = await db.getAllAsync('PRAGMA table_info(medicoes)');
        
        const diagnostico = {
            tableExists: !!tableExists,
            recordCount: count?.count || 0,
            schema: schema || [],
            cacheStatus: {
                hasCache: !!cachedMedicoes,
                cacheSize: cachedMedicoes?.length || 0,
                lastCacheTime: new Date(lastCacheTime).toISOString()
            }
        };

        console.log('Diagnóstico completo:', diagnostico);
        return diagnostico;
    } catch (error) {
        console.error('Erro no diagnóstico:', error);
        return {
            error: error.message,
            tableExists: false,
            recordCount: 0,
            schema: []
        };
    }
};