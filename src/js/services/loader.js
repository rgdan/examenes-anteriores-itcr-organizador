import { state } from '../services/state.js';
import { dom } from '../constants.js';
import { computeHash } from '../utils.js';
import { showToast } from '../components/toast.js';
import { showDuplicatesModal } from '../components/modal.js';
import { renderFileList, updateFileCount, selectFile } from '../views/render-sidebar.js';

export async function addFiles(fileList) {
  const incoming = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
  if (!incoming.length) {
    showToast('No se encontraron archivos PDF.', 'error');
    return;
  }

  const toAdd = [];
  const hashMap = new Map();

  for (const existing of state.files) {
    const h = await computeHash(existing.originalBytes);
    hashMap.set(h, existing.name);
  }

  const duplicates = [];

  for (const file of incoming) {
    const bytes = await file.arrayBuffer();
    const hash = await computeHash(bytes);

    if (hashMap.has(hash)) {
      duplicates.push({ dup: file.name, orig: hashMap.get(hash) });
    } else {
      hashMap.set(hash, file.name);
      toAdd.push({ name: file.name, originalBytes: bytes, modifiedBytes: null, marked: false });
    }
  }

  state.files.push(...toAdd);
  renderFileList();
  updateFileCount();

  if (state.currentIndex === -1 && state.files.length > 0) {
    selectFile(0);
  }

  if (toAdd.length > 0) {
    showToast(`${toAdd.length} archivo(s) cargado(s).`, 'success');
  }

  if (duplicates.length > 0) {
    showDuplicatesModal(duplicates);
  }

  dom.downloadAllBtn().style.display = state.files.length > 0 ? 'inline-flex' : 'none';
}
