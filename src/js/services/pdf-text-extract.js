/**
 * pdf-text-extract.js
 * Extracts and parses metadata from the first page of a PDF.
 * Uses the already-loaded pdfjsLib (PDF.js CDN) to get text content.
 */

/**
 * Extracts plain text from the first page of a PDF byte buffer.
 * @param {ArrayBuffer} bytes
 * @returns {Promise<string>}
 */
export async function extractFirstPageText(bytes) {
  const copy = bytes.slice(0);
  const pdfDoc = await pdfjsLib.getDocument({ data: copy }).promise;
  const page = await pdfDoc.getPage(1);
  const content = await page.getTextContent();
  await pdfDoc.destroy();
  return content.items.map(i => i.str).join(' ');
}

/**
 * Parses a text string looking for year, semester, extraordinario, and exam type clues.
 * Returns an object: { year: string|null, semester: 'IS'|'IIS'|'V'|null, extraordinario: boolean, examType: 'P1'|'P2'|'P3'|null }
 */
export function parsePdfMetadata(text) {
  const result = { year: null, semester: null, extraordinario: false, examType: null };

  // ── Year ──────────────────────────────────────────────────────────────────
  const yearMatches = [...text.matchAll(/\b(19[7-9]\d|20[0-2]\d|2030)\b/g)];
  if (yearMatches.length > 0) {
    result.year = yearMatches[0][1];
  }

  // ── Semester ──────────────────────────────────────────────────────────────
  const t = text.toLowerCase();

  const isSemesterI = (
    /\bi\s+semestre\b/.test(t) ||
    /\bprimer\s+semestre\b/.test(t) ||
    /\b1[eoa]r?\s+semestre\b/.test(t) ||
    /semestre\s+i\b(?!\s*i)/.test(t)
  );

  const isSemesterII = (
    /\bii\s+semestre\b/.test(t) ||
    /\bsegundo\s+semestre\b/.test(t) ||
    /\b2[dao]?\s*semestre\b/.test(t) ||
    /semestre\s+ii\b/.test(t)
  );

  const isVerano = /\bver[ae]no\b/.test(t);

  if (isSemesterII) {
    result.semester = 'IIS';
  } else if (isSemesterI) {
    result.semester = 'IS';
  } else if (isVerano) {
    result.semester = 'V';
  }

  // ── Exam Type ─────────────────────────────────────────────────────────────
  // Matches: "Primer Examen Parcial", "I Examen Parcial", "1er Examen Parcial"
  //          "Segundo Examen Parcial", "II Examen Parcial"
  //          "Tercer Examen Parcial", "III Examen Parcial"
  //          Also loose: "Primer Parcial", "Segundo Parcial", etc.
  const isP1 = (
    /\bprimer[ao]?\s+(examen\s+)?parcial\b/i.test(text) ||
    /\bi\s+(examen\s+)?parcial\b/i.test(text) ||
    /\b1[eoa]r?\s+(examen\s+)?parcial\b/i.test(text)
  );

  const isP2 = (
    /\bsegund[ao]\s+(examen\s+)?parcial\b/i.test(text) ||
    /\bii\s+(examen\s+)?parcial\b/i.test(text) ||
    /\b2[dao]?\s*(examen\s+)?parcial\b/i.test(text)
  );

  const isP3 = (
    /\btercer[ao]?\s+(examen\s+)?parcial\b/i.test(text) ||
    /\biii\s+(examen\s+)?parcial\b/i.test(text) ||
    /\b3[eoa]r?\s*(examen\s+)?parcial\b/i.test(text)
  );

  // P3 before P2 before P1 — longer roman numeral prefixes must be checked first
  if (isP3) {
    result.examType = 'P3';
  } else if (isP2) {
    result.examType = 'P2';
  } else if (isP1) {
    result.examType = 'P1';
  }

  // ── Extraordinario ────────────────────────────────────────────────────────
  if (/extraordinar/i.test(text)) {
    result.extraordinario = true;
  }

  return result;
}
