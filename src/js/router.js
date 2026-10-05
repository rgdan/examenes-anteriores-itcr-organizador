import { state } from './services/state.js';
import { dom } from './constants.js';

const MODE_LABELS = {
  rename: 'Renombrar',
  viewer: 'Visualizar',
  editor: 'Editar',
};

export function setAppMode(name) {
  state.activeModule = name;
  state.selectedMode = name;

  // Show the correct controls pane
  ['rename', 'viewer', 'editor'].forEach(m => {
    const pane = document.getElementById(`module-${m}`);
    if (pane) pane.classList.toggle('active', m === name);
  });

  // Update header badge
  const badge = dom.modeBadge();
  if (badge) badge.textContent = MODE_LABELS[name] || name;

  // Show mode badge & change-mode button & guidelines button
  const wrapper = dom.modeBadgeWrapper();
  const changeBtn = dom.changeModeBtn();
  const guideBtn = dom.guidelinesBtn();
  
  if (wrapper) wrapper.style.display = 'flex';
  if (changeBtn) changeBtn.style.display = 'inline-flex';
  if (guideBtn) guideBtn.style.display = 'inline-flex';
}

/** Legacy alias kept in case anything still calls switchModule */
export const switchModule = setAppMode;
