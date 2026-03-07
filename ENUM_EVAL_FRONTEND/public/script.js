/**
 * Web Page Evaluation Engine - Frontend JavaScript
 * Handles UI interactions and API communication
 */

// Examples of code to paste
const EXAMPLES = {
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Simple Website</title>
</head>
<body>
  <h1>Welcome to My Website</h1>
  <p>This is a simple example of HTML code.</p>
  <button>Click Me</button>
</body>
</html>`,

  styled: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Styled Website</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    h1 {
      color: #333;
      margin-bottom: 16px;
    }
    
    p {
      color: #666;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    
    button {
      background-color: #0066cc;
      color: white;
      padding: 12px 32px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    
    button:hover {
      background-color: #0052a3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to My Website</h1>
    <p>This is a styled example with CSS. The page includes proper typography, spacing, and a button.</p>
    <button>Click Me</button>
  </div>
</body>
</html>`,

  complex: `// React + TypeScript Component Example
import React from 'react';

const App: React.FC = () => {
  const [count, setCount] = React.useState<number>(0);

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#0066cc' }}>React Component Example</h1>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        This is a React component written in TypeScript
      </p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{
          backgroundColor: '#0066cc',
          color: 'white',
          padding: '12px 32px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Clicked {count} times
      </button>
    </div>
  );
};

export default App;`,
};

// DOM Elements
const expectedUrlInput = document.getElementById('expectedUrl');
const studentCodeInput = document.getElementById('studentCode');
const evaluateBtn = document.getElementById('evaluateBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsSection = document.getElementById('resultsSection');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const copyJsonBtn = document.getElementById('copyJsonBtn');
const exampleBtns = document.querySelectorAll('.example-btn');
const errorModal = document.getElementById('errorModal');

let lastResult = null;

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
  evaluateBtn.addEventListener('click', handleEvaluate);
  resetBtn.addEventListener('click', handleReset);
  downloadBtn.addEventListener('click', handleDownload);
  copyJsonBtn.addEventListener('click', handleCopyJson);

  exampleBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const exampleType = e.target.dataset.example;
      if (EXAMPLES[exampleType]) {
        studentCodeInput.value = EXAMPLES[exampleType];
        studentCodeInput.focus();
      }
    });
  });

  // Close error modal
  document
    .querySelector('.modal-close')
    ?.addEventListener('click', closeErrorModal);
  errorModal.addEventListener('click', (e) => {
    if (e.target === errorModal) closeErrorModal();
  });
}

/**
 * Handle evaluation
 */
async function handleEvaluate() {
  const expectedUrl = expectedUrlInput.value.trim();
  const studentCode = studentCodeInput.value.trim();

  // Validation
  if (!expectedUrl) {
    showError('Please enter the expected design URL');
    return;
  }

  if (!studentCode) {
    showError('Please paste your code (HTML, React, or TypeScript)');
    return;
  }

  // Show loading
  loadingIndicator.classList.add('loading-visible');
  evaluateBtn.disabled = true;

  try {
    // Call API to evaluate
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expectedUrl,
        studentCode,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Evaluation failed');
    }

    // Display results
    lastResult = data.result;
    displayResults(data.result);
  } catch (error) {
    console.error('Evaluation error:', error);
    showError(error.message || 'Failed to evaluate. Please try again.');
  } finally {
    loadingIndicator.classList.remove('loading-visible');
    evaluateBtn.disabled = false;
  }
}

/**
 * Display evaluation results
 */
function displayResults(result) {
  // Update verdict
  const verdictBadge = document.getElementById('verdictBadge');
  const verdictDescription = document.getElementById('verdictDescription');

  verdictBadge.textContent = result.final_verdict;
  verdictBadge.className = 'verdict-badge ' + result.final_verdict.toLowerCase();

  if (result.final_verdict === 'PASS') {
    verdictDescription.textContent = '✅ Your code meets the expected design!';
  } else {
    verdictDescription.textContent = '❌ Your code needs adjustments to match the design.';
  }

  // Update similarities
  updateMetric('structure', result.structure_similarity);
  updateMetric('css', result.css_similarity);
  updateMetric('layout', result.layout_similarity);

  // Update scores
  document.getElementById('layoutScore').textContent = result.layout_score.toFixed(1) + '/20';
  document.getElementById('spacingScore').textContent = result.spacing_score.toFixed(1) + '/20';
  document.getElementById('typographyScore').textContent = result.typography_score.toFixed(1) + '/20';
  document.getElementById('colorScore').textContent = result.color_score.toFixed(1) + '/20';
  document.getElementById('componentScore').textContent = result.component_score.toFixed(1) + '/20';
  document.getElementById('structureScore').textContent = result.structure_score.toFixed(1) + '/20';

  // Update total score
  document.getElementById('totalScore').textContent = result.total_score.toFixed(1) + '/120';

  // Update hard failures
  updateHardFailures(result.hard_fail_reason);

  // Update feedback
  updateFeedback(result);

  // Update JSON
  document.getElementById('jsonOutput').textContent = JSON.stringify(result, null, 2);

  // Show results section
  resultsSection.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Update metric display
 */
function updateMetric(type, value) {
  const fillElement = document.getElementById(type + 'Fill');
  const valueElement = document.getElementById(type + 'Value');

  fillElement.style.width = value + '%';
  valueElement.textContent = value.toFixed(1) + '%';
}

/**
 * Update hard failures display
 */
function updateHardFailures(failureReason) {
  const hardFailSection = document.getElementById('hardFailSection');
  const failureBox = document.getElementById('failureBox');

  if (failureReason) {
    hardFailSection.classList.remove('hidden');

    let failureText = '';
    switch (failureReason) {
      case 'MISSING_CORE_COMPONENTS':
        failureText = '❌ <strong>Missing Core Components:</strong> Required elements (buttons, forms, links) are missing from your code.';
        break;
      case 'STRUCTURE_SIMILARITY_BELOW_THRESHOLD':
        failureText = '❌ <strong>Structure Below Threshold:</strong> The overall structure similarity is less than 80%. Review your HTML hierarchy.';
        break;
      case 'PRIMARY_CTA_COLOR_MISMATCH':
        failureText = '❌ <strong>CTA Color Mismatch:</strong> The primary call-to-action button color does not match the expected design.';
        break;
      default:
        failureText = '❌ <strong>Hard Failure:</strong> ' + failureReason;
    }

    failureBox.innerHTML = failureText;
  } else {
    hardFailSection.classList.add('hidden');
  }
}

/**
 * Update feedback and recommendations
 */
function updateFeedback(result) {
  const feedbackList = document.getElementById('feedbackList');
  const feedback = generateFeedback(result);

  feedbackList.innerHTML = feedback
    .map(
      (item) => `
    <div class="feedback-item ${item.type}">
      ${item.icon} ${item.text}
    </div>
  `
    )
    .join('');
}

/**
 * Generate feedback based on scores
 */
function generateFeedback(result) {
  const feedback = [];
  const threshold = 15;

  if (result.layout_score < threshold) {
    feedback.push({
      type: 'warning',
      icon: '⚠️',
      text: '<strong>Layout Issues:</strong> Check element positioning and ensure it matches the expected design within ±15px tolerance.',
    });
  }

  if (result.spacing_score < threshold) {
    feedback.push({
      type: 'warning',
      icon: '⚠️',
      text: '<strong>Spacing Issues:</strong> Adjust margin and padding values to match the reference design.',
    });
  }

  if (result.typography_score < threshold) {
    feedback.push({
      type: 'warning',
      icon: '⚠️',
      text: '<strong>Typography Issues:</strong> Verify font sizes (±2px tolerance) and font weights match the expected design.',
    });
  }

  if (result.color_score < threshold) {
    feedback.push({
      type: 'warning',
      icon: '⚠️',
      text: '<strong>Color Issues:</strong> Ensure text and background colors match the reference design (RGB ±30 tolerance).',
    });
  }

  if (result.component_score < 20) {
    feedback.push({
      type: 'warning',
      icon: '⚠️',
      text: '<strong>Missing Components:</strong> Add or fix critical UI elements like buttons, forms, and links.',
    });
  }

  if (result.structure_score < threshold) {
    feedback.push({
      type: 'warning',
      icon: '⚠️',
      text: '<strong>Structure Issues:</strong> Review your HTML hierarchy and ensure all expected elements are present.',
    });
  }

  // Positive feedback
  if (result.layout_score >= threshold) {
    feedback.push({
      type: 'success',
      icon: '✅',
      text: '<strong>Layout:</strong> Your layout positioning matches the expected design well.',
    });
  }

  if (result.color_score >= threshold) {
    feedback.push({
      type: 'success',
      icon: '✅',
      text: '<strong>Colors:</strong> Your color scheme matches the expected design.',
    });
  }

  if (result.final_verdict === 'PASS') {
    feedback.push({
      type: 'success',
      icon: '🎉',
      text: '<strong>Congratulations!</strong> Your code meets the expected design standards.',
    });
  }

  return feedback;
}

/**
 * Copy JSON to clipboard
 */
function handleCopyJson() {
  const jsonText = document.getElementById('jsonOutput').textContent;
  navigator.clipboard.writeText(jsonText).then(() => {
    copyJsonBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copyJsonBtn.textContent = '📋 Copy JSON';
    }, 2000);
  });
}

/**
 * Download results as JSON
 */
function handleDownload() {
  if (!lastResult) return;

  const json = JSON.stringify(lastResult, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `evaluation-result-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Reset the form
 */
function handleReset() {
  expectedUrlInput.value = 'https://example.com';
  studentCodeInput.value = '';
  resultsSection.classList.add('hidden');
  lastResult = null;
  studentCodeInput.focus();
}

/**
 * Show error modal
 */
function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  errorModal.classList.remove('hidden');
}

/**
 * Close error modal
 */
function closeErrorModal() {
  errorModal.classList.add('hidden');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeEventListeners);
