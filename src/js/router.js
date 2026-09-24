import { state } from './services/state.js';
import { dom } from './constants.js';

export function switchModule(name) {
  state.activeModule = name;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.module === name);
  });

  ['rename', 'viewer', 'editor'].forEach(m => {
    const pane = document.getElementById(`module-${m}`);
    if (pane) pane.classList.toggle('active', m === name);
  });
}
