import {
    getAllAsync,
    runAsync
} from '../database';


const TABLE_NAME =
    'solicitantes';


// =========================================================
// LISTAR CACHE LOCAL
// =========================================================

export const listarSolicitantesCache =
    async () => {

        try {

            const lista =
                await getAllAsync(
                    `
                    SELECT
                        server_id,
                        solicitante,
                        contrato_server_id
                    FROM ${TABLE_NAME}
                    WHERE server_id IS NOT NULL
                    ORDER BY solicitante
                    `
                );


            return lista || [];


        } catch (error) {

            console.error(
                'Erro ao listar cache de Solicitantes:',
                error
            );

            return [];
        }
    };


// =========================================================
// ATUALIZAR CACHE COM DADOS DA API
// =========================================================

export const atualizarSolicitantesCache =
    async (
        solicitantes = []
    ) => {

        try {

            // ---------------------------------------------
            // CACHE É APENAS ESPELHO DA API
            // ---------------------------------------------

            await runAsync(
                `
                DELETE FROM ${TABLE_NAME}
                `
            );


            // ---------------------------------------------
            // INSERE DADOS ATUAIS DA API
            // ---------------------------------------------

            for (
                const solicitante
                of solicitantes
            ) {

                await runAsync(
                    `
                    INSERT INTO ${TABLE_NAME} (
                        server_id,
                        solicitante,
                        contrato_server_id,
                        sync_status
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        'synced'
                    )
                    `,
                    [
                        solicitante.id,

                        solicitante.solicitante,

                        solicitante.contrato_id ??
                        solicitante.contrato ??
                        null
                    ]
                );
            }


            console.log(
                `Cache de Solicitantes atualizado: ${solicitantes.length} registros`
            );


        } catch (error) {

            console.error(
                'Erro atualizando cache de Solicitantes:',
                error
            );

            throw error;
        }
    };