/**
 * Test/Example script demonstrating the evaluation engine
 * 
 * This script shows how to use the evaluation engine with two simple test pages.
 * It creates temporary local HTML files for testing purposes.
 */

import { evaluatePages, printResult } from './index.js';
import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create a simple test HTTP server
 * @param {string} htmlContent - HTML to serve
 * @param {number} port - Port number
 * @returns {Promise<http.Server>}
 */
function createTestServer(htmlContent, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(htmlContent);
    });
    
    server.listen(port, () => {
      console.log(`Test server running on port ${port}`);
      resolve(server);
    });
  });
}

/**
 * Expected design (reference implementation)
 */
const expectedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Expected Design</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 16px;
    }
    
    p {
      font-size: 16px;
      font-weight: 400;
      color: #666;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: white;
      padding: 12px 32px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      margin-right: 12px;
    }
    
    .button:hover {
      background-color: #0052a3;
    }
    
    .button-secondary {
      background-color: #f0f0f0;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to Design System</h1>
    <p>This is the expected design that students should replicate. Pay attention to typography, colors, spacing, and layout.</p>
    <button class="button" id="primary-cta">Get Started</button>
    <button class="button button-secondary">Learn More</button>
  </div>
</body>
</html>
`;

/**
 * Student submission (should be mostly similar but with some variations)
 */
const studentHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Student Submission</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 16px;
    }
    
    p {
      font-size: 16px;
      font-weight: 400;
      color: #666;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: white;
      padding: 12px 32px;
      border-radius: 4px;
      text-decoration: none;
      font-size: 16px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      margin-right: 12px;
    }
    
    .button:hover {
      background-color: #0052a3;
    }
    
    .button-secondary {
      background-color: #f0f0f0;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to Design System</h1>
    <p>This is the expected design that students should replicate. Pay attention to typography, colors, spacing, and layout.</p>
    <button class="button" id="primary-cta">Get Started</button>
    <button class="button button-secondary">Learn More</button>
  </div>
</body>
</html>
`;

/**
 * Run example evaluation
 */
async function runExample() {
  console.log('🚀 Web Page Evaluation Engine - Example\n');
  
  let expectedServer = null;
  let studentServer = null;
  
  try {
    // Start test servers
    expectedServer = await createTestServer(expectedHtml, 3000);
    studentServer = await createTestServer(studentHtml, 3001);
    
    // Wait for servers to be ready
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Run evaluation
    const result = await evaluatePages('http://localhost:3000', 'http://localhost:3001');
    
    // Display results
    printResult(result);
    console.log('\nJSON Output:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error running example:', error);
  } finally {
    // Clean up
    if (expectedServer) expectedServer.close();
    if (studentServer) studentServer.close();
  }
}

// Run if executed directly
runExample().catch(console.error);
