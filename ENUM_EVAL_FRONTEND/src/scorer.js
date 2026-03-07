/**
 * Scoring Module
 * Responsible for computing final scores and verdict based on deterministic rules
 */

/**
 * Calculate individual scores for each category
 * Each category scored 0-20
 * @param {number} layoutSimilarity - Layout similarity percentage (0-100)
 * @param {number} cssSimilarity - CSS similarity percentage (0-100)
 * @param {number} structureSimilarity - Structure similarity percentage (0-100)
 * @param {boolean} criticalComponentsPresent - Whether all critical components exist
 * @param {Object} expectedStyles - Styles from expected page
 * @param {Object} actualStyles - Styles from actual page
 * @param {Object} elementMatches - Element matches
 * @returns {Object} Score breakdown
 */
export function calculateScores(
  layoutSimilarity,
  cssSimilarity,
  structureSimilarity,
  criticalComponentsPresent,
  expectedStyles,
  actualStyles,
  elementMatches
) {
  // Layout score (0-20): Based on layout similarity with stronger penalty for mismatches
  let layoutScore = (layoutSimilarity / 100) * 20;
  if (layoutSimilarity < 97) {
    layoutScore = Math.min(12, layoutScore); // Cap lower if mismatch > 3%
  }

  // Spacing score (0-20): Based on margin and padding accuracy
  let spacingScore = 0;
  let spacingCompares = 0;

  Object.entries(elementMatches).forEach(([actualIdx, expectedIdx]) => {
    const expectedStyle = expectedStyles[expectedIdx];
    const actualStyle = actualStyles[actualIdx];

    if (!expectedStyle || !actualStyle) return;

    // Calculate combined margin and padding difference
    const marginDiff =
      Math.abs(expectedStyle.margin.top - actualStyle.margin.top) +
      Math.abs(expectedStyle.margin.right - actualStyle.margin.right) +
      Math.abs(expectedStyle.margin.bottom - actualStyle.margin.bottom) +
      Math.abs(expectedStyle.margin.left - actualStyle.margin.left);

    const paddingDiff =
      Math.abs(expectedStyle.padding.top - actualStyle.padding.top) +
      Math.abs(expectedStyle.padding.right - actualStyle.padding.right) +
      Math.abs(expectedStyle.padding.bottom - actualStyle.padding.bottom) +
      Math.abs(expectedStyle.padding.left - actualStyle.padding.left);

    const spacingDiff = marginDiff + paddingDiff;

    // Tolerance: 6px total difference (stricter)
    if (spacingDiff <= 6) {
      spacingScore += 20;
    } else if (spacingDiff <= 20) {
      spacingScore += Math.max(8, 20 - spacingDiff / 1.5);
    } else {
      spacingScore += Math.max(0, 20 - spacingDiff / 2.5);
    }

    spacingCompares++;
  });

  spacingScore = spacingCompares > 0 ? spacingScore / spacingCompares : 0;
  spacingScore = Math.min(20, spacingScore);

  // Typography score (0-20): Based on font-size and font-weight
  let typographyScore = 0;
  let typographyCompares = 0;

  Object.entries(elementMatches).forEach(([actualIdx, expectedIdx]) => {
    const expectedStyle = expectedStyles[expectedIdx];
    const actualStyle = actualStyles[actualIdx];

    if (!expectedStyle || !actualStyle) return;

    let typeScore = 20;

    // Font size tolerance: 1px (stricter)
    const fontDiff = Math.abs(expectedStyle.fontSize - actualStyle.fontSize);
    if (fontDiff > 1) {
      typeScore -= Math.min(12, fontDiff * 3);
    }

    // Font weight comparison
    if (expectedStyle.fontWeight !== actualStyle.fontWeight) {
      typeScore -= 7;
    }

    typographyScore += Math.max(0, typeScore);
    typographyCompares++;
  });

  typographyScore = typographyCompares > 0 ? typographyScore / typographyCompares : 0;
  typographyScore = Math.min(20, typographyScore);

  // Color score (0-20): Based on text and background colors
  let colorScore = 0;
  let colorCompares = 0;

  Object.entries(elementMatches).forEach(([actualIdx, expectedIdx]) => {
    const expectedStyle = expectedStyles[expectedIdx];
    const actualStyle = actualStyles[actualIdx];

    if (!expectedStyle || !actualStyle) return;

    let cScore = 20;

    // Text color comparison (RGB threshold: 10 - stricter)
    const colorDiff =
      Math.abs(expectedStyle.color.r - actualStyle.color.r) +
      Math.abs(expectedStyle.color.g - actualStyle.color.g) +
      Math.abs(expectedStyle.color.b - actualStyle.color.b);

    if (colorDiff > 10) {
      cScore -= Math.min(12, colorDiff / 2.5);
    }

    // Background color comparison
    const bgDiff =
      Math.abs(expectedStyle.backgroundColor.r - actualStyle.backgroundColor.r) +
      Math.abs(expectedStyle.backgroundColor.g - actualStyle.backgroundColor.g) +
      Math.abs(expectedStyle.backgroundColor.b - actualStyle.backgroundColor.b);

    if (bgDiff > 10) {
      cScore -= Math.min(12, bgDiff / 2.5);
    }

    colorScore += Math.max(0, cScore);
    colorCompares++;
  });

  colorScore = colorCompares > 0 ? colorScore / colorCompares : 0;
  colorScore = Math.min(20, colorScore);

  // Component score (0-20): Presence of critical components
  let componentScore = criticalComponentsPresent ? 20 : 0;

  // Structure score (0-20): Based on overall structural similarity
  let structureScore = (structureSimilarity / 100) * 20;

  return {
    layout_score: Math.round(layoutScore * 100) / 100,
    spacing_score: Math.round(spacingScore * 100) / 100,
    typography_score: Math.round(typographyScore * 100) / 100,
    color_score: Math.round(colorScore * 100) / 100,
    component_score: Math.round(componentScore * 100) / 100,
    structure_score: Math.round(structureScore * 100) / 100,
  };
}

/**
 * Apply deterministic hard failure rules
 * @param {boolean} criticalComponentsPresent - Whether critical components present
 * @param {number} structureSimilarity - Structure similarity percentage
 * @param {Object} expectedStyles - Styles from expected page
 * @param {Object} actualStyles - Styles from actual page
 * @param {Object} elementMatches - Element matches
 * @returns {string|null} Failure reason or null if no failure
 */
export function checkHardFailures(
  criticalComponentsPresent,
  structureSimilarity,
  expectedStyles,
  actualStyles,
  elementMatches
) {
  // Hard failure 1: Core component missing
  if (!criticalComponentsPresent) {
    return 'MISSING_CORE_COMPONENTS';
  }

  // Hard failure 2: Structure similarity < 85% (stricter)
  if (structureSimilarity < 85) {
    return 'STRUCTURE_SIMILARITY_BELOW_THRESHOLD';
  }

  // Hard failure 3: Primary CTA color mismatch
  // Find button/CTA elements and check color
  let ctaColorMismatch = false;

  Object.entries(elementMatches).forEach(([actualIdx, expectedIdx]) => {
    const expectedStyle = expectedStyles[expectedIdx];
    const actualStyle = actualStyles[actualIdx];

    if (!expectedStyle || !actualStyle) return;

    // Check if this is likely a CTA (button with background)
    const isCta =
      expectedStyle.backgroundColor.a > 0 &&
      (expectedStyle.display === 'block' || expectedStyle.display === 'inline-block');

    if (isCta) {
      const bgDiff =
        Math.abs(expectedStyle.backgroundColor.r - actualStyle.backgroundColor.r) +
        Math.abs(expectedStyle.backgroundColor.g - actualStyle.backgroundColor.g) +
        Math.abs(expectedStyle.backgroundColor.b - actualStyle.backgroundColor.b);

      // Color threshold for CTA: significant difference (stricter)
      if (bgDiff > 30) {
        ctaColorMismatch = true;
      }
    }
  });

  if (ctaColorMismatch) {
    return 'PRIMARY_CTA_COLOR_MISMATCH';
  }

  return null;
}

/**
 * Determine final pass/fail verdict
 * @param {number} totalScore - Total calculated score
 * @param {string|null} hardFailReason - Reason for hard failure, if any
 * @returns {string} 'PASS' or 'FAIL'
 */
export function determineFinalVerdict(totalScore, hardFailReason) {
  // Hard failures always result in FAIL
  if (hardFailReason !== null) {
    return 'FAIL';
  }

  // PASS only if total score >= 90 and no hard failure (stricter)
  if (totalScore >= 90) {
    return 'PASS';
  }

  return 'FAIL';
}

/**
 * Compile final evaluation result
 * @param {Object} similarities - Object containing similarity percentages
 * @param {Object} scores - Score breakdown object
 * @param {string|null} hardFailReason - Hard failure reason if any
 * @param {string} finalVerdict - 'PASS' or 'FAIL'
 * @returns {Object} Final evaluation result in required format
 */
export function compileEvaluationResult(similarities, scores, hardFailReason, finalVerdict) {
  const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);

  return {
    structure_similarity: Math.round(similarities.structure * 100) / 100,
    css_similarity: Math.round(similarities.css * 100) / 100,
    layout_similarity: Math.round(similarities.layout * 100) / 100,
    layout_score: scores.layout_score,
    spacing_score: scores.spacing_score,
    typography_score: scores.typography_score,
    color_score: scores.color_score,
    component_score: scores.component_score,
    structure_score: scores.structure_score,
    total_score: Math.round(totalScore * 100) / 100,
    hard_fail_reason: hardFailReason,
    final_verdict: finalVerdict,
  };
}
