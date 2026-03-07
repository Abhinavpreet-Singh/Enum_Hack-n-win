# Web Page Evaluation Engine

Production-ready Node.js evaluation engine that compares two web pages (expected design vs student submission) using Playwright.

## Features

- **Headless Chromium Rendering**: Launches browser with consistent 1440x900 viewport
- **Network Idle Waiting**: Ensures full page load before extraction
- **Animation Disabled**: Consistent rendering environment via CSS injection
- **DOM Structure Extraction**: Traverses complete DOM tree, tracks element hierarchy
- **Computed Style Analysis**: Extracts 13+ CSS properties per element using `getComputedStyle()`
- **Layout Geometry**: Records position and dimensions via `getBoundingClientRect()`
- **Intelligent Element Matching**: Multi-strategy matching (ID → classes+tag → DOM position)
- **Similarity Metrics**: Structure, CSS, and layout similarity calculations
- **Deterministic Scoring**: 6 score categories (0-20 each), hard failure rules
- **Production-Ready**: Modular architecture, comprehensive comments, error handling

## Project Structure

```
src/
├── index.js           # Main orchestrator & CLI
├── extractor.js       # DOM/CSS/geometry extraction
├── comparator.js      # Element matching & similarity calculation
└── scorer.js          # Scoring & verdict determination
```

## Installation

```bash
npm install
```

## Usage

```bash
# Compare two URLs
node src/index.js <expected-url> <student-url>

# Example:
node src/index.js https://example.com https://student.example.com
```

## Output Format

Returns JSON with:
- **structure_similarity**: 0-100 (elements matched)
- **css_similarity**: 0-100 (style properties)
- **layout_similarity**: 0-100 (position & dimensions)
- **layout_score**: 0-20 (position accuracy)
- **spacing_score**: 0-20 (margin/padding)
- **typography_score**: 0-20 (font size/weight)
- **color_score**: 0-20 (text & background colors)
- **component_score**: 0-20 (critical elements present)
- **structure_score**: 0-20 (overall structure)
- **total_score**: 0-120 (sum of all scores)
- **hard_fail_reason**: null or failure code
- **final_verdict**: "PASS" or "FAIL"

## Scoring Rules

### Hard Failures (Always FAIL):
1. **Core components missing** (buttons, forms, links)
2. **Structure similarity < 80%**
3. **Primary CTA color mismatch** (RGB difference > 60)

### Pass Criteria:
- Total score ≥ 85
- No hard failures

### Layout Penalty:
- If > 5% elements have position shift > 15px → max layout_score = 15

## Algorithm Details

### Element Matching (Priority order):
1. **ID matching** (highest priority)
2. **Class + tag matching** (second priority)
3. **DOM position fallback** (if no ID/class match)

### Similarity Calculation:
- **Structure**: Percentage of expected elements matched
- **CSS**: Average property deviation across matched pairs
  - Font size: ±2px tolerance
  - Colors: RGB ±30 tolerance
  - Margin/padding: ±5px tolerance
  - Font weight & display must match
- **Layout**: Position & dimension deviation
  - Position: ±15px tolerance
  - Dimensions: ±15px tolerance
  - Penalty if > 5% have mismatches > 15px

### Scoring Formula:
Each category weighted 0-20:
- **Layout**: layout_similarity / 5 (capped at 15 if > 5% mismatch)
- **Spacing**: Average margin+padding accuracy
- **Typography**: Font size/weight consistency
- **Color**: Text & background color closeness
- **Component**: 20 if critical components present, else 0
- **Structure**: structure_similarity / 5

## Notes

- Never outputs 100 unless pages are pixel-perfect identical
- All calculations are deterministic (no AI/ML)
- Element visibility determined by `getBoundingClientRect()` > 0 dimensions
- Colors parsed from computed RGB values
- Timeout handling: Proceeds if networkidle times out after 30s
# ENUM_EVAL_FRONTEND
