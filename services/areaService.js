import {
    getAllAsync,
    runAsync
} from '../database';


const TABLE_NAME =
    'areas';


// =========================================================
// LISTAR CACHE LOCAL
// =========================================================

export const listarAreasCache =
    async () => {

        try {

            const lista =
                await getAllAsync(
                    `
                    SELECT
                        server_id,
                        area,
                        contrato_server_id
                    FROM ${TABLE_NAME}
                    WHERE server_id IS NOT NULL
                    ORDER BY area
                    `
                );


            return lista || [];


        } catch (error) {

            console.error(
                'Erro ao listar cache de Áreas:',
                error
            );

            return [];
        }
    };


// =========================================================
// ATUALIZAR CACHE COM DADOS DA API
// =========================================================

export const atualizarAreasCache =
    async (
        areas = []
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
                const area
                of areas
            ) {

                await runAsync(
                    `
                    INSERT INTO ${TABLE_NAME} (
                        server_id,
                        area,
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
                        area.id,

                        area.area,

                        area.contrato_id ??
                        area.contrato ??
                        null
                    ]
                );
            }


            console.log(
                `Cache de Áreas atualizado: ${areas.length} registros`
            );


        } catch (error) {

            console.error(
                'Erro atualizando cache de Áreas:',
                error
            );

            throw error;
        }
    };