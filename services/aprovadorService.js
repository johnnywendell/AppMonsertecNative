import {
    getAllAsync,
    runAsync
} from '../database';


const TABLE_NAME =
    'aprovadores';


// =========================================================
// LISTAR CACHE LOCAL
// =========================================================

export const listarAprovadoresCache =
    async () => {

        try {

            const lista =
                await getAllAsync(
                    `
                    SELECT
                        server_id,
                        aprovador,
                        contrato_server_id
                    FROM ${TABLE_NAME}
                    WHERE server_id IS NOT NULL
                    ORDER BY aprovador
                    `
                );


            return lista || [];


        } catch (error) {

            console.error(
                'Erro ao listar cache de Aprovadores:',
                error
            );

            return [];
        }
    };


// =========================================================
// ATUALIZAR CACHE COM DADOS DA API
// =========================================================

export const atualizarAprovadoresCache =
    async (
        aprovadores = []
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
                const aprovador
                of aprovadores
            ) {

                await runAsync(
                    `
                    INSERT INTO ${TABLE_NAME} (
                        server_id,
                        aprovador,
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
                        aprovador.id,

                        aprovador.aprovador,

                        aprovador.contrato_id ??
                        aprovador.contrato ??
                        null
                    ]
                );
            }


            console.log(
                `Cache de Aprovadores atualizado: ${aprovadores.length} registros`
            );


        } catch (error) {

            console.error(
                'Erro atualizando cache de Aprovadores:',
                error
            );

            throw error;
        }
    };