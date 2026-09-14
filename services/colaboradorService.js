import {
    getAllAsync,
    runAsync
} from '../database';


const TABLE_NAME =
    'colaboradores';


// =========================================================
// LISTAR CACHE LOCAL
// =========================================================

export const listarColaboradoresCache =
    async () => {

        try {

            const lista =
                await getAllAsync(
                    `
                    SELECT
                        server_id,
                        nome,
                        matricula,
                        funcao,
                        disciplina,
                        ativo
                    FROM ${TABLE_NAME}
                    WHERE server_id IS NOT NULL
                    ORDER BY nome ASC
                    `
                );


            return lista || [];


        } catch (error) {

            console.error(
                'Erro ao listar cache de Colaboradores:',
                error
            );

            return [];
        }
    };


// =========================================================
// ATUALIZAR CACHE COM DADOS DA API
// =========================================================

export const atualizarColaboradoresCache =
    async (
        colaboradores = []
    ) => {

        try {

            // -------------------------------------------------
            // CACHE É ESPELHO DO CADASTRO DE COLABORADORES ATIVOS
            // -------------------------------------------------

            await runAsync(
                `
                DELETE FROM ${TABLE_NAME}
                `
            );


            // -------------------------------------------------
            // INSERE DADOS DA API
            // -------------------------------------------------

            for (
                const colaborador
                of colaboradores
            ) {

                await runAsync(
                    `
                    INSERT INTO ${TABLE_NAME} (
                        server_id,
                        nome,
                        matricula,
                        funcao,
                        disciplina,
                        ativo,
                        sync_status
                    )
                    VALUES (
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
                        colaborador.id,

                        colaborador.nome ?? '',

                        colaborador.matricula ?? '',

                        colaborador.funcao ?? '',

                        colaborador.disciplina ?? '',

                        String(
                            colaborador.ativo ?? '1'
                        )
                    ]
                );
            }


            console.log(
                `Cache de Colaboradores atualizado: ${colaboradores.length} registros`
            );


        } catch (error) {

            console.error(
                'Erro atualizando cache de Colaboradores:',
                error
            );

            throw error;
        }
    };