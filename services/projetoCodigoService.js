import {
    getAllAsync,
    runAsync
} from '../database';


const TABLE_NAME =
    'projeto_codigos';


// =========================================================
// LISTAR CACHE LOCAL
// =========================================================

export const listarProjetoCodigosCache =
    async () => {

        try {

            const lista =
                await getAllAsync(
                    `
                    SELECT
                        server_id,
                        projeto_nome,
                        contrato_server_id
                    FROM ${TABLE_NAME}
                    WHERE server_id IS NOT NULL
                    ORDER BY projeto_nome
                    `
                );


            return lista || [];


        } catch (error) {

            console.error(
                'Erro ao listar cache de Códigos de Projeto:',
                error
            );

            return [];
        }
    };


// =========================================================
// ATUALIZAR CACHE COM DADOS DA API
// =========================================================

export const atualizarProjetoCodigosCache =
    async (
        projetos = []
    ) => {

        try {

            // -------------------------------------------------
            // COMO AGORA É APENAS CACHE:
            //
            // API é a fonte oficial.
            //
            // Podemos apagar o cache anterior e recriar
            // com exatamente o que veio do servidor.
            // -------------------------------------------------

            await runAsync(
                `
                DELETE FROM ${TABLE_NAME}
                `
            );


            // -------------------------------------------------
            // INSERE DADOS ATUAIS DA API
            // -------------------------------------------------

            for (
                const projeto
                of projetos
            ) {

                await runAsync(
                    `
                    INSERT INTO ${TABLE_NAME} (
                        server_id,
                        projeto_nome,
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
                        projeto.id,

                        projeto.projeto_nome,

                        projeto.contrato_id ??
                        projeto.contrato ??
                        null
                    ]
                );
            }


            console.log(
                `Cache de Projetos atualizado: ${projetos.length} registros`
            );


        } catch (error) {

            console.error(
                'Erro atualizando cache de Códigos de Projeto:',
                error
            );

            throw error;
        }
    };