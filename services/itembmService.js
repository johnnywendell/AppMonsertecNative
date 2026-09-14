import {
    getAllAsync,
    runAsync
} from '../database';


const TABLE_NAME =
    'itens_bm';


// =========================================================
// LISTAR CACHE LOCAL
// =========================================================

export const listarItensBmCache =
    async () => {

        try {

            const lista =
                await getAllAsync(
                    `
                    SELECT
                        server_id,
                        item_ref,
                        disciplina,
                        descricao,
                        und,
                        preco_item,
                        obs,
                        data,
                        contrato_server_id
                    FROM ${TABLE_NAME}
                    WHERE server_id IS NOT NULL
                    ORDER BY item_ref
                    `
                );


            return lista || [];


        } catch (error) {

            console.error(
                'Erro ao listar cache de Itens BM:',
                error
            );

            return [];
        }
    };


// =========================================================
// ATUALIZAR CACHE COM DADOS DA API
// =========================================================

export const atualizarItensBmCache =
    async (
        itens = []
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
            // INSERE DADOS DA API
            // ---------------------------------------------

            for (
                const item
                of itens
            ) {

                await runAsync(
                    `
                    INSERT INTO ${TABLE_NAME} (
                        server_id,
                        item_ref,
                        disciplina,
                        descricao,
                        und,
                        preco_item,
                        obs,
                        data,
                        contrato_server_id,
                        sync_status
                    )
                    VALUES (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'synced'
                    )
                    `,
                    [
                        item.id,

                        item.item_ref,

                        item.disciplina ??
                        null,

                        item.descricao ??
                        '',

                        item.und ??
                        '',

                        item.preco_item ??
                        null,

                        item.obs ??
                        '',

                        item.data ??
                        null,

                        item.contrato_id ??
                        item.contrato ??
                        null
                    ]
                );
            }


            console.log(
                `Cache de Itens BM atualizado: ${itens.length} registros`
            );


        } catch (error) {

            console.error(
                'Erro atualizando cache de Itens BM:',
                error
            );

            throw error;
        }
    };