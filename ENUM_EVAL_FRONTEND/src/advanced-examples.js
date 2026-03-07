/**
 * Advanced Usage Examples
 * Demonstrates different ways to use the evaluation engine
 */

import { evaluatePages, printResult } from './index.js';
import fs from 'fs/promises';

/**
 * Example 1: Basic evaluation with JSON output to file
 */
export async function example1_BasicEvaluation() {
  console.log('Example 1: Basic Evaluation\n');

  const expectedUrl = 'https://www.example.com';
  const studentUrl = 'https://student-submission.example.com';

  try {
    const result = await evaluatePages(expectedUrl, studentUrl);

    // Save to file
    await fs.writeFile(
      'result.json',
      JSON.stringify(result, null, 2),
      'utf-8'
    );

    printResult(result);
    console.log('✅ Result saved to result.json\n');
  } catch (error) {
    console.error('❌ Evaluation failed:', error.message);
  }
}

/**
 * Example 2: Batch evaluation of multiple submissions
 */
export async function example2_BatchEvaluation() {
  console.log('Example 2: Batch Evaluation\n');

  const expectedUrl = 'https://www.example.com';
  const submissions = [
    'https://student1.example.com',
    'https://student2.example.com',
    'https://student3.example.com',
  ];

  const results = [];

  for (let i = 0; i < submissions.length; i++) {
    console.log(`Evaluating submission ${i + 1}/${submissions.length}...`);

    try {
      const result = await evaluatePages(expectedUrl, submissions[i]);
      results.push({
        submission: submissions[i],
        ...result,
      });
    } catch (error) {
      console.error(`❌ Submission ${i + 1} failed:`, error.message);
      results.push({
        submission: submissions[i],
        error: error.message,
      });
    }
  }

  // Summary report
  console.log('\n📊 Batch Results Summary:\n');
  results.forEach((r, idx) => {
    if (r.error) {
      console.log(`${idx + 1}. ${r.submission} - ERROR: ${r.error}`);
    } else {
      console.log(
        `${idx + 1}. ${r.submission} - ${r.final_verdict} (${r.total_score.toFixed(2)}/120)`
      );
    }
  });

  // Save results
  await fs.writeFile(
    'batch-results.json',
    JSON.stringify(results, null, 2),
    'utf-8'
  );

  console.log('\n✅ Batch results saved to batch-results.json\n');
}

/**
 * Example 3: Custom result processor
 */
export async function example3_CustomProcessor() {
  console.log('Example 3: Custom Result Processing\n');

  const expectedUrl = 'https://www.example.com';
  const studentUrl = 'https://student.example.com';

  try {
    const result = await evaluatePages(expectedUrl, studentUrl);

    // Custom analysis
    const passedCategories = [];
    const failedCategories = [];

    const scores = {
      layout: result.layout_score,
      spacing: result.spacing_score,
      typography: result.typography_score,
      color: result.color_score,
      component: result.component_score,
      structure: result.structure_score,
    };

    // 15/20 is considered passing for a category
    Object.entries(scores).forEach(([category, score]) => {
      if (score >= 15) {
        passedCategories.push(`${category}: ${score}/20`);
      } else {
        failedCategories.push(`${category}: ${score}/20`);
      }
    });

    console.log('Passed Categories (≥15/20):');
    passedCategories.forEach((cat) => console.log(`  ✅ ${cat}`));

    if (failedCategories.length > 0) {
      console.log('\nFailed Categories (<15/20):');
      failedCategories.forEach((cat) => console.log(`  ❌ ${cat}`));
    }

    console.log(`\nOverall: ${result.final_verdict}`);
    console.log(`Total Score: ${result.total_score.toFixed(2)}/120`);

    if (result.hard_fail_reason) {
      console.log(`Hard Fail Reason: ${result.hard_fail_reason}`);
    }
  } catch (error) {
    console.error('❌ Evaluation failed:', error.message);
  }
}

/**
 * Example 4: Comparing against multiple expected designs
 * Useful for ensuring consistency across variations
 */
export async function example4_MultipleExpectedDesigns() {
  console.log('Example 4: Comparing Against Multiple Expected Designs\n');

  const expectedDesigns = [
    'https://design-v1.example.com',
    'https://design-v2.example.com',
  ];

  const studentUrl = 'https://student.example.com';

  try {
    console.log('Evaluating student submission against multiple design versions...\n');

    const results = [];

    for (const expectedUrl of expectedDesigns) {
      const result = await evaluatePages(expectedUrl, studentUrl);
      results.push({
        expectedDesign: expectedUrl,
        score: result.total_score,
        verdict: result.final_verdict,
      });
    }

    // Show results
    console.log('Comparison Results:\n');
    results.forEach((r) => {
      console.log(`Design: ${r.expectedDesign}`);
      console.log(`  Score: ${r.score.toFixed(2)}/120`);
      console.log(`  Verdict: ${r.verdict}\n`);
    });

    // Find best match
    const bestMatch = results.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    console.log(`✅ Best match: ${bestMatch.expectedDesign}`);
  } catch (error) {
    console.error('❌ Evaluation failed:', error.message);
  }
}

/**
 * Example 5: Detailed diagnostic report
 */
export async function example5_DetailedDiagnosticReport() {
  console.log('Example 5: Detailed Diagnostic Report\n');

  const expectedUrl = 'https://www.example.com';
  const studentUrl = 'https://student.example.com';

  try {
    const result = await evaluatePages(expectedUrl, studentUrl);

    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      urls: {
        expected: expectedUrl,
        student: studentUrl,
      },
      verdict: result.final_verdict,
      totalScore: result.total_score,
      hardFailReason: result.hard_fail_reason,
      similarities: {
        structure: result.structure_similarity,
        css: result.css_similarity,
        layout: result.layout_similarity,
        average: (
          (result.structure_similarity +
            result.css_similarity +
            result.layout_similarity) /
          3
        ).toFixed(2),
      },
      scoreBreakdown: {
        layout: {
          score: result.layout_score,
          maxScore: 20,
          percentage: ((result.layout_score / 20) * 100).toFixed(1) + '%',
        },
        spacing: {
          score: result.spacing_score,
          maxScore: 20,
          percentage: ((result.spacing_score / 20) * 100).toFixed(1) + '%',
        },
        typography: {
          score: result.typography_score,
          maxScore: 20,
          percentage: ((result.typography_score / 20) * 100).toFixed(1) + '%',
        },
        color: {
          score: result.color_score,
          maxScore: 20,
          percentage: ((result.color_score / 20) * 100).toFixed(1) + '%',
        },
        component: {
          score: result.component_score,
          maxScore: 20,
          percentage: ((result.component_score / 20) * 100).toFixed(1) + '%',
        },
        structure: {
          score: result.structure_score,
          maxScore: 20,
          percentage: ((result.structure_score / 20) * 100).toFixed(1) + '%',
        },
      },
      passThreshold: {
        minimumScore: 85,
        currentScore: result.total_score,
        met: result.total_score >= 85,
      },
      recommendations: generateRecommendations(result),
    };

    // Save detailed report
    await fs.writeFile(
      'diagnostic-report.json',
      JSON.stringify(report, null, 2),
      'utf-8'
    );

    console.log(JSON.stringify(report, null, 2));
    console.log('\n✅ Detailed report saved to diagnostic-report.json\n');
  } catch (error) {
    console.error('❌ Evaluation failed:', error.message);
  }
}

/**
 * Generate recommendations based on evaluation results
 */
function generateRecommendations(result) {
  const recommendations = [];

  if (result.layout_score < 15) {
    recommendations.push('Layout: Review element positioning and responsiveness');
  }

  if (result.spacing_score < 15) {
    recommendations.push('Spacing: Adjust margins and padding values');
  }

  if (result.typography_score < 15) {
    recommendations.push('Typography: Check font sizes and weights');
  }

  if (result.color_score < 15) {
    recommendations.push('Color: Ensure text and background colors match design');
  }

  if (result.component_score < 20) {
    recommendations.push('Components: Add or fix missing interactive elements');
  }

  if (result.structure_score < 15) {
    recommendations.push('Structure: Review HTML hierarchy and element structure');
  }

  if (result.hard_fail_reason) {
    recommendations.push(`Critical Issue: ${result.hard_fail_reason}`);
  }

  return recommendations.length > 0
    ? recommendations
    : ['✅ No specific issues detected'];
}

// Example menu
const examples = {
  1: example1_BasicEvaluation,
  2: example2_BatchEvaluation,
  3: example3_CustomProcessor,
  4: example4_MultipleExpectedDesigns,
  5: example5_DetailedDiagnosticReport,
};

console.log('Available Examples:');
console.log('  1. Basic Evaluation');
console.log('  2. Batch Evaluation');
console.log('  3. Custom Result Processor');
console.log('  4. Multiple Expected Designs');
console.log('  5. Detailed Diagnostic Report');
console.log(
  '\nUncomment the example you want to run in this file, or import and call directly.\n'
);

// Run example (uncomment desired example):
// await example1_BasicEvaluation();
// await example2_BatchEvaluation();
// await example3_CustomProcessor();
// await example4_MultipleExpectedDesigns();
// await example5_DetailedDiagnosticReport();

export default { example1_BasicEvaluation, example2_BatchEvaluation, example3_CustomProcessor, example4_MultipleExpectedDesigns, example5_DetailedDiagnosticReport };
