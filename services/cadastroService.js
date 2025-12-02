import { api } from './api';
import { getDb } from '../database';

// ======================= ÁREA =======================
const AREA_ENDPOINT = 'api/v1/geral/areas/';

export const listarAreas = async () => {
  const db = await getDb();
  const locais = await db.getAllAsync("SELECT * FROM areas ORDER BY area ASC");

  syncAreas().catch(() => {});
  return locais;
};

export const syncAreas = async () => {
  try {
    const { data } = await api.get(AREA_ENDPOINT);
    const db = await getDb();

    await db.execAsync('BEGIN');
    await db.execAsync('DELETE FROM areas');

    for (const item of data) {
      await db.runAsync(
        `INSERT INTO areas (id, area) VALUES (?, ?)`,
        [item.id, item.area]
      );
    }

    await db.execAsync('COMMIT');
    console.log(`Áreas sincronizadas: ${data.length}`);
  } catch (err) {
    console.log("Falha sincronizar Áreas", err.message);
  }
};


// ======================= SOLICITANTE =======================
const SOLIC_ENDPOINT = 'api/v1/geral/solicitantes/';

export const listarSolicitantes = async () => {
  const db = await getDb();
  const locais = await db.getAllAsync("SELECT * FROM solicitantes ORDER BY solicitante ASC");

  syncSolicitantes().catch(() => {});
  return locais;
};

export const syncSolicitantes = async () => {
  try {
    const { data } = await api.get(SOLIC_ENDPOINT);
    const db = await getDb();

    await db.execAsync('BEGIN');
    await db.execAsync('DELETE FROM solicitantes');

    for (const item of data) {
      await db.runAsync(
        `INSERT INTO solicitantes (id, solicitante) VALUES (?, ?)`,
        [item.id, item.solicitante]
      );
    }

    await db.execAsync('COMMIT');
    console.log(`Solicitantes sincronizados: ${data.length}`);
  } catch (err) {
    console.log("Falha sincronizar Solicitantes", err.message);
  }
};


// ======================= APROVADOR =======================
const APROV_ENDPOINT = 'api/v1/geral/aprovadores/';

export const listarAprovadores = async () => {
  const db = await getDb();
  const locais = await db.getAllAsync("SELECT * FROM aprovadores ORDER BY aprovador ASC");

  syncAprovadores().catch(() => {});
  return locais;
};

export const syncAprovadores = async () => {
  try {
    const { data } = await api.get(APROV_ENDPOINT);
    const db = await getDb();

    await db.execAsync('BEGIN');
    await db.execAsync('DELETE FROM aprovadores');

    for (const item of data) {
      await db.runAsync(
        `INSERT INTO aprovadores (id, aprovador, usuario_id)
         VALUES (?, ?, ?)`,
        [item.id, item.aprovador, item.usuario ?? null]
      );
    }

    await db.execAsync('COMMIT');
    console.log(`Aprovadores sincronizados: ${data.length}`);
  } catch (err) {
    console.log("Falha sincronizar Aprovadores", err.message);
  }
};


// ======================= ITEM BM =======================
const ITEMBM_ENDPOINT = 'api/v1/geral/itens-bm/';

export const listarItensBm = async () => {
  const db = await getDb();
  const locais = await db.getAllAsync("SELECT * FROM itens_bm ORDER BY item_ref ASC");

  syncItensBm().catch(() => {});
  return locais;
};

export const syncItensBm = async () => {
  try {
    const { data } = await api.get(ITEMBM_ENDPOINT);
    const db = await getDb();

    await db.execAsync('BEGIN');
    await db.execAsync('DELETE FROM itens_bm');

    for (const item of data) {
      await db.runAsync(
        `INSERT INTO itens_bm (id, item_ref, disciplina, descricao, und, preco_item, obs, data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.item_ref,
          item.disciplina,
          item.descricao,
          item.und,
          item.preco_item,
          item.obs ?? "",
          item.data
        ]
      );
    }

    await db.execAsync('COMMIT');
    console.log(`Itens BM sincronizados: ${data.length}`);
  } catch (err) {
    console.log("Falha sincronizar Itens BM", err.message);
  }
};

