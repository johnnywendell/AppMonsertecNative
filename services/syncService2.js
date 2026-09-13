import NetInfo from '@react-native-community/netinfo';

import { api } from './api';

import {
    getPendingOperations,
    removeOfflineOperation,
    registerOfflineError,
} from '../offlineQueue';


let syncing = false;


export async function syncPendingOperations() {

    if (syncing) {
        console.log('🔄 Sincronização já está em andamento.');
        return;
    }

    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
        console.log('📵 Sem conexão. Sync pendente.');
        return;
    }

    syncing = true;

    try {

        const operations = await getPendingOperations();

        if (!operations.length) {
            return;
        }

        console.log(
            `🔄 Encontradas ${operations.length} operação(ões) pendente(s).`
        );

        for (const item of operations) {

            try {

                const payload = JSON.parse(item.payload);

                console.log(
                    `⬆️ Sincronizando ${item.entity} [${item.id}]`
                );

                switch (item.operation) {

                    case 'POST':

                        await api.post(
                            item.endpoint,
                            payload
                        );

                        break;


                    case 'PUT':

                        await api.put(
                            item.endpoint,
                            payload
                        );

                        break;


                    case 'PATCH':

                        await api.patch(
                            item.endpoint,
                            payload
                        );

                        break;


                    default:

                        throw new Error(
                            `Operação não suportada: ${item.operation}`
                        );
                }


                await removeOfflineOperation(
                    item.id
                );


                console.log(
                    `✅ Operação ${item.id} sincronizada.`
                );


            } catch (error) {

                const errorData =
                    error.response?.data ||
                    error.message ||
                    error;


                console.error(
                    `❌ Erro ao sincronizar operação ${item.id}:`,
                    errorData
                );


                await registerOfflineError(
                    item.id,
                    errorData
                );
            }
        }

    } catch (error) {

        console.error(
            '❌ Erro geral da sincronização:',
            error
        );

    } finally {

        syncing = false;

    }
}