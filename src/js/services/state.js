export const state = {
  /** @type {Array<{name: string, originalBytes: ArrayBuffer, modifiedBytes: ArrayBuffer|null, marked: boolean}>} */
  files: [],
  currentIndex: -1,
  currentPage: 0,     // 0-based
  totalPages: 0,
  pdfJsDoc: null,     // PDF.js document for rendering
  renderTask: null,   // active PDF.js render task
  activeModule: 'rename',
  markedSet: new Set(), // indices of marked files

  // Onboarding state
  /** @type {'rename'|'viewer'|'editor'|null} */
  selectedMode: null,
  onboardingComplete: false,
};
