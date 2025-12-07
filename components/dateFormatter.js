// src/utils/dateFormatter.js

/**
 * Corrige o problema de fuso horário ao converter um objeto Date do JavaScript
 * para uma string de data pura (YYYY-MM-DD), garantindo que o dia selecionado
 * no calendário local seja o dia enviado ao backend.
 * * @param {Date} dateObj O objeto Date a ser formatado.
 * @returns {string} A data formatada como 'YYYY-MM-DD'.
 */
export const formatLocalDateToISOString = (dateObj) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj)) {
        console.error('Objeto inválido fornecido para formatação de data:', dateObj);
        return null;
    }

    // Usamos os métodos .getFullYear(), .getMonth() e .getDate() que retornam
    // os valores baseados no Fuso Horário Local (GMT do seu dispositivo), 
    // e construímos a string no formato YYYY-MM-DD.
    
    const year = dateObj.getFullYear();
    // getMonth() é zero-based (0 = Janeiro), então somamos 1.
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};