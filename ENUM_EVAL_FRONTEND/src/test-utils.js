/**
 * Test Utilities & Validation
 * Helper functions for testing the evaluation engine
 */

import { evaluatePages, printResult } from './index.js';

/**
 * Validate result structure
 * @param {Object} result - Evaluation result
 * @returns {Object} Validation report
 */
export function validateResult(result) {
  const errors = [];
  const warnings = [];

  // Check required fields
  const requiredFields = [
    'structure_similarity',
    'css_similarity',
    'layout_similarity',
    'layout_score',
    'spacing_score',
    'typography_score',
    'color_score',
    'component_score',
    'structure_score',
    'total_score',
    'hard_fail_reason',
    'final_verdict',
  ];

  requiredFields.forEach((field) => {
    if (!(field in result)) {
      errors.push(`Missing required field: ${field}`);
    }
  });

  // Validate numeric ranges
  if (result.structure_similarity !== null) {
    if (result.structure_similarity < 0 || result.structure_similarity > 100) {
      errors.push(`structure_similarity out of range: ${result.structure_similarity}`);
    }
  }

  if (result.css_similarity !== null) {
    if (result.css_similarity < 0 || result.css_similarity > 100) {
      errors.push(`css_similarity out of range: ${result.css_similarity}`);
    }
  }

  if (result.layout_similarity !== null) {
    if (result.layout_similarity < 0 || result.layout_similarity > 100) {
      errors.push(`layout_similarity out of range: ${result.layout_similarity}`);
    }
  }

  // Validate scores (0-20)
  const scoreFields = [
    'layout_score',
    'spacing_score',
    'typography_score',
    'color_score',
    'component_score',
    'structure_score',
  ];

  scoreFields.forEach((field) => {
    if (result[field] < 0 || result[field] > 20) {
      errors.push(`${field} out of range: ${result[field]}`);
    }
  });

  // Validate total score (0-120)
  const expectedTotal = scoreFields.reduce((sum, field) => sum + result[field], 0);
  if (Math.abs(result.total_score - expectedTotal) > 0.1) {
    errors.push(
      `total_score mismatch: got ${result.total_score}, expected ~${expectedTotal}`
    );
  }

  if (result.total_score < 0 || result.total_score > 120) {
    errors.push(`total_score out of range: ${result.total_score}`);
  }

  // Validate hard_fail_reason
  const validReasons = [
    null,
    'MISSING_CORE_COMPONENTS',
    'STRUCTURE_SIMILARITY_BELOW_THRESHOLD',
    'PRIMARY_CTA_COLOR_MISMATCH',
  ];

  if (!validReasons.includes(result.hard_fail_reason)) {
    errors.push(`Invalid hard_fail_reason: ${result.hard_fail_reason}`);
  }

  // Validate verdict
  if (!['PASS', 'FAIL'].includes(result.final_verdict)) {
    errors.push(`Invalid final_verdict: ${result.final_verdict}`);
  }

  // Validate verdict logic
  if (result.hard_fail_reason !== null && result.final_verdict !== 'FAIL') {
    errors.push('Verdict should be FAIL when hard_fail_reason is not null');
  }

  if (result.final_verdict === 'PASS' && result.total_score < 85) {
    errors.push('Verdict should be FAIL when total_score < 85');
  }

  // Check never-100 rule
  if (result.structure_similarity === 100) {
    warnings.push('structure_similarity is 100 (pages must be identical)');
  }

  if (result.css_similarity === 100) {
    warnings.push('css_similarity is 100 (pages must be identical)');
  }

  if (result.layout_similarity === 100) {
    warnings.push('layout_similarity is 100 (pages must be identical)');
  }

  scoreFields.forEach((field) => {
    if (result[field] === 20) {
      warnings.push(`${field} is 20/20 (category must be perfect)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Compare two evaluation results
 * @param {Object} result1 - First result
 * @param {Object} result2 - Second result
 * @returns {Object} Comparison report
 */
export function compareResults(result1, result2) {
  const diffs = {};

  const fields = [
    'structure_similarity',
    'css_similarity',
    'layout_similarity',
    'layout_score',
    'spacing_score',
    'typography_score',
    'color_score',
    'component_score',
    'structure_score',
    'total_score',
  ];

  fields.forEach((field) => {
    const diff = result2[field] - result1[field];
    const percentChange = (diff / result1[field]) * 100;

    diffs[field] = {
      result1: result1[field],
      result2: result2[field],
      difference: diff.toFixed(2),
      percentChange: percentChange.toFixed(2) + '%',
    };
  });

  return {
    verdict1: result1.final_verdict,
    verdict2: result2.final_verdict,
    changes: diffs,
  };
}

/**
 * Simulate a test run with known inputs
 * Useful for verifying engine correctness
 */
export async function runDiagnosticTest(expectedUrl, studentUrl) {
  console.log('🔍 Running Diagnostic Test\n');
  console.log(`Expected: ${expectedUrl}`);
  console.log(`Student: ${studentUrl}\n`);

  try {
    const result = await evaluatePages(expectedUrl, studentUrl);

    // Validate result
    const validation = validateResult(result);

    if (validation.valid) {
      console.log('✅ Result structure: VALID\n');
    } else {
      console.log('❌ Result structure: INVALID\n');
      validation.errors.forEach((err) => console.log(`  • ${err}`));
      return;
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      validation.warnings.forEach((warn) => console.log(`  • ${warn}`));
      console.log();
    }

    // Analyze scores
    console.log('📊 Score Analysis:\n');

    const scores = {
      layout: result.layout_score,
      spacing: result.spacing_score,
      typography: result.typography_score,
      color: result.color_score,
      component: result.component_score,
      structure: result.structure_score,
    };

    const passThreshold = 15;
    Object.entries(scores).forEach(([category, score]) => {
      const status = score >= passThreshold ? '✅' : '❌';
      const pct = ((score / 20) * 100).toFixed(0);
      console.log(`  ${status} ${category.padEnd(12)}: ${score.toFixed(2)}/20 (${pct}%)`);
    });

    console.log(`\n  Total: ${result.total_score.toFixed(2)}/120`);
    console.log(`  Verdict: ${result.final_verdict === 'PASS' ? '✅' : '❌'} ${result.final_verdict}`);

    if (result.hard_fail_reason) {
      console.log(`  Failure Reason: ${result.hard_fail_reason}`);
    }

    // Print full result
    console.log('\n📋 Full Result:\n');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('❌ Diagnostic test failed:', error.message);
  }
}

/**
 * Check if result indicates a PASS verdict
 * @param {Object} result - Evaluation result
 * @returns {boolean}
 */
export function isPass(result) {
  return result.final_verdict === 'PASS';
}

/**
 * Check if result indicates a FAIL verdict
 * @param {Object} result - Evaluation result
 * @returns {boolean}
 */
export function isFail(result) {
  return result.final_verdict === 'FAIL';
}

/**
 * Get overall quality assessment
 * @param {Object} result - Evaluation result
 * @returns {string} Assessment text
 */
export function getQualityAssessment(result) {
  if (result.total_score >= 110) {
    return 'Exceptional - Nearly pixel-perfect reproduction';
  }
  if (result.total_score >= 100) {
    return 'Excellent - High-quality implementation';
  }
  if (result.total_score >= 90) {
    return 'Very Good - Solid implementation with minor issues';
  }
  if (result.total_score >= 85) {
    return 'Good - Acceptable implementation';
  }
  if (result.total_score >= 75) {
    return 'Fair - Multiple issues to address';
  }
  if (result.total_score >= 60) {
    return 'Poor - Significant differences from design';
  }
  return 'Critical - Does not match expected design';
}

/**
 * Export results in multiple formats
 */
export async function exportResults(result, formats = ['json']) {
  const exports = {};

  if (formats.includes('json')) {
    exports.json = JSON.stringify(result, null, 2);
  }

  if (formats.includes('csv')) {
    const fields = [
      'structure_similarity',
      'css_similarity',
      'layout_similarity',
      'layout_score',
      'spacing_score',
      'typography_score',
      'color_score',
      'component_score',
      'structure_score',
      'total_score',
      'final_verdict',
    ];

    const values = fields.map((f) => result[f] || '');
    exports.csv = fields.join(',') + '\n' + values.join(',');
  }

  if (formats.includes('html')) {
    exports.html = `
<!DOCTYPE html>
<html>
<head>
  <title>Evaluation Result</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    h1 { color: #333; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>Evaluation Result</h1>
  <p>Verdict: <span class="${result.final_verdict === 'PASS' ? 'pass' : 'fail'}">${result.final_verdict}</span></p>
  <p>Total Score: ${result.total_score.toFixed(2)}/120</p>
  
  <h2>Similarities</h2>
  <ul>
    <li>Structure: ${result.structure_similarity.toFixed(2)}%</li>
    <li>CSS: ${result.css_similarity.toFixed(2)}%</li>
    <li>Layout: ${result.layout_similarity.toFixed(2)}%</li>
  </ul>
  
  <h2>Scores</h2>
  <table>
    <tr><th>Category</th><th>Score</th></tr>
    <tr><td>Layout</td><td>${result.layout_score.toFixed(2)}/20</td></tr>
    <tr><td>Spacing</td><td>${result.spacing_score.toFixed(2)}/20</td></tr>
    <tr><td>Typography</td><td>${result.typography_score.toFixed(2)}/20</td></tr>
    <tr><td>Color</td><td>${result.color_score.toFixed(2)}/20</td></tr>
    <tr><td>Component</td><td>${result.component_score.toFixed(2)}/20</td></tr>
    <tr><td>Structure</td><td>${result.structure_score.toFixed(2)}/20</td></tr>
  </table>
  
  ${result.hard_fail_reason ? `<p><strong>Failure Reason:</strong> ${result.hard_fail_reason}</p>` : ''}
</body>
</html>
    `.trim();
  }

  return exports;
}

export default {
  validateResult,
  compareResults,
  runDiagnosticTest,
  isPass,
  isFail,
  getQualityAssessment,
  exportResults,
};
