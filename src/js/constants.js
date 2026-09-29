export const dom = {
  fileInput:         () => document.getElementById('file-input'),
  downloadAllBtn:    () => document.getElementById('download-all-btn'),
  fileList:          () => document.getElementById('file-list'),
  fileCount:         () => document.getElementById('file-count'),
  emptyState:        () => document.getElementById('empty-state'),
  workArea:          () => document.getElementById('work-area'),
  currentFilename:   () => document.getElementById('current-filename'),
  markBadge:         () => document.getElementById('mark-badge'),
  downloadSingleBtn: () => document.getElementById('download-single-btn'),

  // PDF Canvas
  pdfCanvas:         () => document.getElementById('pdf-canvas'),
  canvasLoading:     () => document.getElementById('canvas-loading'),
  prevPageBtn:       () => document.getElementById('prev-page-btn'),
  nextPageBtn:       () => document.getElementById('next-page-btn'),
  pageCounter:       () => document.getElementById('page-counter'),
  zoomInBtn:         () => document.getElementById('zoom-in-btn'),
  zoomOutBtn:        () => document.getElementById('zoom-out-btn'),

  // Modules
  moduleRename:      () => document.getElementById('module-rename'),
  moduleViewer:      () => document.getElementById('module-viewer'),
  moduleEditor:      () => document.getElementById('module-editor'),

  // Rename
  renamePreviewName: () => document.getElementById('rename-preview-name'),
  anoSelect:         () => document.getElementById('ano-select'),
  chkExtra:          () => document.getElementById('chk-extra'),
  chkVariation:      () => document.getElementById('chk-variation'),
  variationSelect:   () => document.getElementById('variation-select'),
  renameApplyBtn:    () => document.getElementById('rename-apply-btn'),
  renameDeleteBtn:   () => document.getElementById('rename-delete-btn'),
  renameProgress:    () => document.getElementById('rename-progress'),

  // Viewer
  chkMark:           () => document.getElementById('chk-mark'),
  markedItemsList:   () => document.getElementById('marked-items-list'),
  prevFileBtn:       () => document.getElementById('prev-file-btn'),
  nextFileBtn:       () => document.getElementById('next-file-btn'),
  saveMarksBtn:      () => document.getElementById('save-marks-btn'),
  viewerProgress:    () => document.getElementById('viewer-progress'),

  // Editor
  deletePagesInput:  () => document.getElementById('delete-pages-input'),
  deletePagesBtn:    () => document.getElementById('delete-pages-btn'),
  splitRowsContainer:() => document.getElementById('split-rows-container'),
  addSplitRowBtn:    () => document.getElementById('add-split-row-btn'),
  executeSplitBtn:   () => document.getElementById('execute-split-btn'),
  editorProgress:    () => document.getElementById('editor-progress'),

  // Modals
  dupModal:                () => document.getElementById('dup-modal'),
  dupTableBody:            () => document.getElementById('dup-table-body'),
  dupDismissBtn:           () => document.getElementById('dup-dismiss-btn'),
  screenWarningModal:      () => document.getElementById('screen-warning-modal'),

  // Onboarding Modal
  onboardingModal:         () => document.getElementById('onboarding-modal'),
  onboardingStepUpload:    () => document.getElementById('onboarding-step-upload'),
  onboardingStepMode:      () => document.getElementById('onboarding-step-mode'),
  onboardingDropZone:      () => document.getElementById('onboarding-drop-zone'),
  onboardingFileCount:     () => document.getElementById('onboarding-file-count'),
  onboardingFileListPreview:() => document.getElementById('onboarding-file-list-preview'),
  onboardingContinueBtn:   () => document.getElementById('onboarding-continue-btn'),
  onboardingBackBtn:       () => document.getElementById('onboarding-back-btn'),

  // Header mode badge
  modeBadgeWrapper:        () => document.getElementById('mode-badge-wrapper'),
  modeBadge:               () => document.getElementById('mode-badge'),
  changeModeBtn:           () => document.getElementById('change-mode-btn'),

  // Toast
  toastContainer:    () => document.getElementById('toast-container'),
};

