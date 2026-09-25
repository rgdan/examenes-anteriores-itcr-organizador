export const dom = {
  fileInput:         () => document.getElementById('file-input'),
  downloadAllBtn:    () => document.getElementById('download-all-btn'),
  dropZone:          () => document.getElementById('drop-zone'),
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
  renameSkipBtn:     () => document.getElementById('rename-skip-btn'),
  renameQuarantineBtn:() => document.getElementById('rename-quarantine-btn'),
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

  // Modal
  dupModal:                () => document.getElementById('dup-modal'),
  dupTableBody:            () => document.getElementById('dup-table-body'),
  dupDismissBtn:           () => document.getElementById('dup-dismiss-btn'),
  screenWarningModal:      () => document.getElementById('screen-warning-modal'),

  // Toast
  toastContainer:    () => document.getElementById('toast-container'),
};
