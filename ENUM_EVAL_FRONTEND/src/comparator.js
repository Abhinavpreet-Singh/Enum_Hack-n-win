/**
 * Comparison Engine Module
 * Responsible for matching elements and computing similarity metrics
 */

/**
 * Match elements between expected and actual pages
 * Uses multi-level strategy: id > classes+tag > DOM position
 * @param {Array} expectedElements - DOM elements from expected page
 * @param {Array} actualElements - DOM elements from actual page
 * @returns {Object} Map of actual element index to expected element index
 */
export function matchElements(expectedElements, actualElements) {
  const matches = {};
  const usedExpectedIndices = new Set();

  // Strategy 1: Match by element ID (highest priority)
  const expectedById = new Map();
  expectedElements.forEach((el, idx) => {
    if (el.elementId) {
      expectedById.set(el.elementId, idx);
    }
  });

  actualElements.forEach((actualEl, actualIdx) => {
    if (actualEl.elementId && expectedById.has(actualEl.elementId)) {
      const expectedIdx = expectedById.get(actualEl.elementId);
      matches[actualIdx] = expectedIdx;
      usedExpectedIndices.add(expectedIdx);
    }
  });

  // Strategy 2: Match by class + tag combination
  actualElements.forEach((actualEl, actualIdx) => {
    if (matches[actualIdx] !== undefined) return; // Already matched

    const classKey = actualEl.classList.sort().join('|') + '|' + actualEl.tagName;

    for (let i = 0; i < expectedElements.length; i++) {
      if (usedExpectedIndices.has(i)) continue;

      const expectedEl = expectedElements[i];
      const expectedKey = expectedEl.classList.sort().join('|') + '|' + expectedEl.tagName;

      if (classKey === expectedKey) {
        matches[actualIdx] = i;
        usedExpectedIndices.add(i);
        break;
      }
    }
  });

  // Strategy 3: Match by DOM position (fallback)
  actualElements.forEach((actualEl, actualIdx) => {
    if (matches[actualIdx] !== undefined) return; // Already matched

    const depthMatch = expectedElements.filter(
      (el) => el.depth === actualEl.depth && !usedExpectedIndices.has(expectedElements.indexOf(el))
    );

    if (depthMatch.length > 0) {
      const expectedIdx = expectedElements.indexOf(depthMatch[0]);
      matches[actualIdx] = expectedIdx;
      usedExpectedIndices.add(expectedIdx);
    }
  });

  return matches;
}

/**
 * Calculate structure similarity between expected and actual
 * @param {Array} expectedElements - DOM elements from expected page
 * @param {Array} actualElements - DOM elements from actual page
 * @param {Object} elementMatches - Map of actual index to expected index
 * @returns {number} Similarity percentage (0-100)
 */
export function calculateStructureSimilarity(expectedElements, actualElements, elementMatches) {
  // Structure similarity = matched elements / total expected elements
  const matchedCount = Object.keys(elementMatches).length;
  const totalExpected = expectedElements.length;

  if (totalExpected === 0) return 100;

  // Each matched element contributes to similarity
  const matchedPercentage = (matchedCount / totalExpected) * 100;

  // Bonus: if all expected elements are matched
  const allMatched = matchedCount === totalExpected ? 100 : matchedPercentage;

  return Math.min(100, allMatched);
}

/**
 * Calculate CSS similarity between matched elements
 * @param {Object} expectedStyles - Styles from expected page
 * @param {Object} actualStyles - Styles from actual page
 * @param {Object} elementMatches - Map of actual index to expected index
 * @returns {number} Similarity percentage (0-100)
 */
export function calculateCssSimilarity(expectedStyles, actualStyles, elementMatches) {
  if (Object.keys(elementMatches).length === 0) return 0;

  let totalSimilarity = 0;
  let comparedCount = 0;

  Object.entries(elementMatches).forEach(([actualIdx, expectedIdx]) => {
    const expectedStyle = expectedStyles[expectedIdx];
    const actualStyle = actualStyles[actualIdx];

    if (!expectedStyle || !actualStyle) return;

    let elementSimilarity = 100;

    // Compare font-size (tolerance: 1px - stricter)
    const fontSizeDiff = Math.abs(expectedStyle.fontSize - actualStyle.fontSize);
    if (fontSizeDiff > 1) {
      elementSimilarity -= Math.min(20, fontSizeDiff * 3);
    }

    // Compare font-weight
    if (expectedStyle.fontWeight !== actualStyle.fontWeight) {
      elementSimilarity -= 7;
    }

    // Compare color (RGB threshold: 10 - much stricter)
    const colorDiff =
      Math.abs(expectedStyle.color.r - actualStyle.color.r) +
      Math.abs(expectedStyle.color.g - actualStyle.color.g) +
      Math.abs(expectedStyle.color.b - actualStyle.color.b);

    if (colorDiff > 10) {
      elementSimilarity -= Math.min(25, colorDiff / 2);
    }

    // Compare background color
    const bgDiff =
      Math.abs(expectedStyle.backgroundColor.r - actualStyle.backgroundColor.r) +
      Math.abs(expectedStyle.backgroundColor.g - actualStyle.backgroundColor.g) +
      Math.abs(expectedStyle.backgroundColor.b - actualStyle.backgroundColor.b);

    if (bgDiff > 10) {
      elementSimilarity -= Math.min(25, bgDiff / 2);
    }

    // Compare display
    if (expectedStyle.display !== actualStyle.display) {
      elementSimilarity -= 15;
    }

    // Compare margin (tolerance: 3px - stricter)
    const marginDiff =
      Math.abs(expectedStyle.margin.top - actualStyle.margin.top) +
      Math.abs(expectedStyle.margin.right - actualStyle.margin.right) +
      Math.abs(expectedStyle.margin.bottom - actualStyle.margin.bottom) +
      Math.abs(expectedStyle.margin.left - actualStyle.margin.left);

    if (marginDiff > 3) {
      elementSimilarity -= Math.min(18, marginDiff / 1.5);
    }

    // Compare padding (tolerance: 3px - stricter)
    const paddingDiff =
      Math.abs(expectedStyle.padding.top - actualStyle.padding.top) +
      Math.abs(expectedStyle.padding.right - actualStyle.padding.right) +
      Math.abs(expectedStyle.padding.bottom - actualStyle.padding.bottom) +
      Math.abs(expectedStyle.padding.left - actualStyle.padding.left);

    if (paddingDiff > 3) {
      elementSimilarity -= Math.min(18, paddingDiff / 1.5);
    }

    totalSimilarity += Math.max(0, elementSimilarity);
    comparedCount++;
  });

  if (comparedCount === 0) return 0;
  return totalSimilarity / comparedCount;
}

/**
 * Calculate layout similarity (position and dimensions)
 * @param {Object} expectedGeometry - Layout geometry from expected page
 * @param {Object} actualGeometry - Layout geometry from actual page
 * @param {Object} elementMatches - Map of actual index to expected index
 * @returns {number} Similarity percentage (0-100)
 */
export function calculateLayoutSimilarity(expectedGeometry, actualGeometry, elementMatches) {
  if (Object.keys(elementMatches).length === 0) return 0;

  let totalSimilarity = 0;
  let comparedCount = 0;
  let mismatchCount = 0;

  Object.entries(elementMatches).forEach(([actualIdx, expectedIdx]) => {
    const expectedRect = expectedGeometry[expectedIdx];
    const actualRect = actualGeometry[actualIdx];

    if (!expectedRect || !actualRect) return;

    let elementSimilarity = 100;

    // Compare position (tolerance: 8px - stricter)
    const xDiff = Math.abs(expectedRect.x - actualRect.x);
    const yDiff = Math.abs(expectedRect.y - actualRect.y);

    if (xDiff > 8 || yDiff > 8) {
      mismatchCount++;
      elementSimilarity -= Math.min(35, Math.max(xDiff, yDiff) / 1.5);
    }

    // Compare dimensions
    const widthDiff = Math.abs(expectedRect.width - actualRect.width);
    const heightDiff = Math.abs(expectedRect.height - actualRect.height);

    if (widthDiff > 8 || heightDiff > 8) {
      mismatchCount++;
      elementSimilarity -= Math.min(35, (widthDiff + heightDiff) / 3);
    }

    totalSimilarity += Math.max(0, elementSimilarity);
    comparedCount++;
  });

  if (comparedCount === 0) return 0;

  // Apply penalty for significant layout mismatches (> 5%)
  const mismatchPercentage = (mismatchCount / comparedCount) * 100;

  let result = totalSimilarity / comparedCount;

  // Stronger penalty for layout mismatches (> 3%)
  if (mismatchPercentage > 3) {
    result -= mismatchPercentage * 0.7;
  }

  return Math.max(0, Math.min(100, result));
}

/**
 * Identify critical components (buttons, forms, links)
 * @param {Array} elements - DOM elements
 * @returns {Array} Indices of critical elements
 */
export function identifyCriticalComponents(elements) {
  const criticalTags = ['button', 'a', 'input', 'textarea', 'select', 'form'];
  const criticalClasses = ['btn', 'cta', 'submit', 'link', 'primary', 'secondary'];

  return elements
    .map((el, idx) => ({
      idx,
      isCritical:
        criticalTags.includes(el.tagName) ||
        el.classList.some((cls) => criticalClasses.some((crit) => cls.toLowerCase().includes(crit))),
    }))
    .filter((item) => item.isCritical)
    .map((item) => item.idx);
}

/**
 * Check if all critical components are present
 * @param {Array} expectedElements - Elements from expected page
 * @param {Object} elementMatches - Map of actual to expected indices
 * @returns {boolean} True if all critical components found
 */
export function allCriticalComponentsPresent(expectedElements, elementMatches) {
  const criticalExpectedIndices = identifyCriticalComponents(expectedElements);

  // Check if all critical expected components have a match
  const matchedExpectedIndices = new Set(Object.values(elementMatches));

  return criticalExpectedIndices.every((idx) => matchedExpectedIndices.has(idx));
}
