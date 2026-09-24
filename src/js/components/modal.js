import { dom } from '../constants.js';
import { escapeHtml, shortenName } from '../utils.js';

export function showDuplicatesModal(duplicates) {
  const tbody = dom.dupTableBody();
  tbody.innerHTML = '';

  duplicates.forEach(({ dup, orig }) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td title="${escapeHtml(dup)}">${escapeHtml(shortenName(dup))}</td>
      <td title="${escapeHtml(orig)}">${escapeHtml(shortenName(orig))}</td>
      <td><span style="color: var(--warning); font-size:11px; font-weight:600;">No cargado</span></td>
    `;
    tbody.appendChild(tr);
  });

  dom.dupModal().style.display = 'flex';
}
