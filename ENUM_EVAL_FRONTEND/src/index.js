/**
 * Main Evaluation Engine
 * Orchestrates the complete evaluation workflow
 */

import { chromium } from 'playwright';
import {
  extractDomStructure,
  extractComputedStyles,
  extractLayoutGeometry,
  preparePageForExtraction,
} from './extractor.js';
import {
  matchElements,
  calculateStructureSimilarity,
  calculateCssSimilarity,
  calculateLayoutSimilarity,
  identifyCriticalComponents,
  allCriticalComponentsPresent,
} from './comparator.js';
import {
  calculateScores,
  checkHardFailures,
  determineFinalVerdict,
  compileEvaluationResult,
} from './scorer.js';

/**
 * Main evaluation function
 * @param {string} expectedUrl - URL of expected design
 * @param {string} studentUrl - URL of student submission
 * @returns {Promise<Object>} Evaluation result
 */
export async function evaluatePages(expectedUrl, studentUrl) {
  let browser = null;

  try {
    console.log(`🔍 Starting evaluation...`);
    console.log(`  Expected: ${expectedUrl}`);
    console.log(`  Actual: ${studentUrl}`);

    // STEP 1: Render pages with identical viewport
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();

    // Create pages with identical viewport
    const expectedPage = await context.newPage();
    const studentPage = await context.newPage();

    const viewport = { width: 1440, height: 900 };
    await expectedPage.setViewportSize(viewport);
    await studentPage.setViewportSize(viewport);

    console.log(`\n📱 Loading pages with viewport ${viewport.width}x${viewport.height}...`);

    // Navigate to both URLs
    await expectedPage.goto(expectedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await studentPage.goto(studentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Prepare pages (disable animations, wait for idle)
    await preparePageForExtraction(expectedPage);
    await preparePageForExtraction(studentPage);

    // STEP 2: Extract structured DOM
    console.log(`\n🌳 Extracting DOM structure...`);
    const expectedDom = await extractDomStructure(expectedPage);
    const studentDom = await extractDomStructure(studentPage);

    console.log(`  Expected: ${expectedDom.length} visible elements`);
    console.log(`  Student: ${studentDom.length} visible elements`);

    // STEP 3: Extract computed CSS
    console.log(`\n🎨 Extracting computed styles...`);
    const expectedStyles = await extractComputedStyles(expectedPage, expectedDom);
    const studentStyles = await extractComputedStyles(studentPage, studentDom);

    // STEP 4: Extract layout geometry
    console.log(`📐 Extracting layout geometry...`);
    const expectedGeometry = await extractLayoutGeometry(expectedPage);
    const studentGeometry = await extractLayoutGeometry(studentPage);

    // STEP 5: Comparison logic
    console.log(`\n⚖️  Comparing pages...`);

    // Match elements using multi-strategy approach
    const elementMatches = matchElements(expectedDom, studentDom);
    console.log(`  Matched ${Object.keys(elementMatches).length} elements`);

    // Calculate similarities
    const structureSimilarity = calculateStructureSimilarity(
      expectedDom,
      studentDom,
      elementMatches
    );
    const cssSimilarity = calculateCssSimilarity(expectedStyles, studentStyles, elementMatches);
    const layoutSimilarity = calculateLayoutSimilarity(
      expectedGeometry,
      studentGeometry,
      elementMatches
    );

    console.log(`  Structure similarity: ${structureSimilarity.toFixed(2)}%`);
    console.log(`  CSS similarity: ${cssSimilarity.toFixed(2)}%`);
    console.log(`  Layout similarity: ${layoutSimilarity.toFixed(2)}%`);

    // STEP 6: Scoring system
    console.log(`\n📊 Calculating scores...`);

    // Check if all critical components are present
    const criticalComponentsPresent = allCriticalComponentsPresent(expectedDom, elementMatches);
    console.log(`  Critical components present: ${criticalComponentsPresent}`);

    // Calculate individual scores
    const scores = calculateScores(
      layoutSimilarity,
      cssSimilarity,
      structureSimilarity,
      criticalComponentsPresent,
      expectedStyles,
      studentStyles,
      elementMatches
    );

    console.log(`  Layout score: ${scores.layout_score}/20`);
    console.log(`  Spacing score: ${scores.spacing_score}/20`);
    console.log(`  Typography score: ${scores.typography_score}/20`);
    console.log(`  Color score: ${scores.color_score}/20`);
    console.log(`  Component score: ${scores.component_score}/20`);
    console.log(`  Structure score: ${scores.structure_score}/20`);

    const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);
    console.log(`  Total score: ${totalScore.toFixed(2)}/120`);

    // Check hard failures
    const hardFailReason = checkHardFailures(
      criticalComponentsPresent,
      structureSimilarity,
      expectedStyles,
      studentStyles,
      elementMatches
    );

    // Determine verdict
    const finalVerdict = determineFinalVerdict(totalScore, hardFailReason);

    // STEP 7: Compile output
    const result = compileEvaluationResult(
      {
        structure: structureSimilarity,
        css: cssSimilarity,
        layout: layoutSimilarity,
      },
      scores,
      hardFailReason,
      finalVerdict
    );

    console.log(`\n✅ Evaluation complete!`);
    console.log(`  Verdict: ${result.final_verdict}`);
    if (result.hard_fail_reason) {
      console.log(`  Reason: ${result.hard_fail_reason}`);
    }

    // Close browser
    await browser.close();

    return result;
  } catch (error) {
    console.error('❌ Evaluation failed:', error.message);
    if (browser) await browser.close();
    throw error;
  }
}

/**
 * Print result in pretty format
 * @param {Object} result - Evaluation result
 */
export function printResult(result) {
  console.log('\n' + '='.repeat(60));
  console.log('EVALUATION RESULT');
  console.log('='.repeat(60));
  console.log(`\nSimilarity Metrics:`);
  console.log(`  Structure:  ${result.structure_similarity.toFixed(2)}%`);
  console.log(`  CSS:        ${result.css_similarity.toFixed(2)}%`);
  console.log(`  Layout:     ${result.layout_similarity.toFixed(2)}%`);

  console.log(`\nScores (0-20 each):`);
  console.log(`  Layout:      ${result.layout_score.toFixed(2)}/20`);
  console.log(`  Spacing:     ${result.spacing_score.toFixed(2)}/20`);
  console.log(`  Typography: ${result.typography_score.toFixed(2)}/20`);
  console.log(`  Color:       ${result.color_score.toFixed(2)}/20`);
  console.log(`  Component:   ${result.component_score.toFixed(2)}/20`);
  console.log(`  Structure:   ${result.structure_score.toFixed(2)}/20`);

  console.log(`\nFinal Score:  ${result.total_score.toFixed(2)}/120`);
  console.log(`\nVerdict:      ${result.final_verdict}`);
  if (result.hard_fail_reason) {
    console.log(`Fail Reason:  ${result.hard_fail_reason}`);
  }
  console.log('='.repeat(60) + '\n');
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const expectedUrl = process.argv[2] || 'https://example.com';
  const studentUrl = process.argv[3] || 'https://example.com';

  evaluatePages(expectedUrl, studentUrl)
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      printResult(result);
      process.exit(result.final_verdict === 'PASS' ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default { evaluatePages, printResult };
