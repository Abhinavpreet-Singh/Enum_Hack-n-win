/**
 * Web Page Evaluation Engine - Express Server
 * Provides REST API and serves frontend interface
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { evaluatePages } from './src/index.js';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for temporary pages
const tempPages = new Map();
let pageCounter = 0;

/**
 * Detect if code is React/Next.js/TypeScript component
 */
function detectComponentType(code) {
  const isTypeScript = /\.(tsx?|d\.ts)$/.test(code) || /:\s*(React\.FC|ReactNode|ReactElement|JSX\.Element)/.test(code) || /interface\s+Props|type\s+Props/.test(code);
  const isTsx = /export\s+default/.test(code) && /<[^>]+>/.test(code);
  const isNextJs = /useRouter|Image\s+from\s+['"]next\/image|Link\s+from\s+['"]next\/link/.test(code) || /getStaticProps|getServerSideProps|getStaticPaths/.test(code);
  
  return {
    isTsx,
    isTypeScript,
    isNextJs,
    needsCompilation: isTsx || isTypeScript || isNextJs
  };
}

/**
 * POST /api/create-page
 * Create a temporary page from HTML code
 */
app.post('/api/create-page', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code is required' });
    }

    const pageId = `temp_${++pageCounter}_${Date.now()}`;
    const pageUrl = `http://localhost:${PORT}/temp/${pageId}`;

    // Detect component type (React/Next.js/TypeScript)
    const { needsCompilation, isNextJs, isTypeScript } = detectComponentType(code);

    if (needsCompilation) {
      try {
        // Transform TSX/TypeScript to JavaScript
        const transformed = await esbuild.transform(code, { 
          loader: 'tsx', 
          target: 'es2017',
          jsx: 'transform'
        });
        
        // For Next.js, provide additional polyfills and router mock
        const nextJsPolyfill = isNextJs ? `
        const mockRouter = {
          push: (path) => console.log('Navigation to:', path),
          pathname: '/',
          query: {},
          asPath: '/',
          isReady: true
        };
        ` : '';

        // Wrap in HTML with React CDN and TypeScript support
        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Student App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    #root { min-height: 100vh; }
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    try {
      const exports = {}; 
      const module = { exports };
      const window_obj = window;
      ${nextJsPolyfill}
      // Mock next/router for Next.js support
      if (!window.__NEXT_ROUTER__) {
        window.__NEXT_ROUTER__ = { useRouter: () => mockRouter };
      }
      ${transformed.code}
      const Component = module.exports.default || module.exports;
      if (typeof Component === 'function') {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Component));
      } else {
        console.warn('Component export not found or invalid');
        document.getElementById('root').innerHTML = '<p>Error: Component did not export properly</p>';
      }
    } catch (error) {
      console.error('Runtime error:', error);
      document.getElementById('root').innerHTML = '<pre style="color:red;padding:20px;">Error: ' + error.message + '</pre>';
    }
  </script>
</body>
</html>`;
        tempPages.set(pageId, html);
        console.log(`✅ Page created: ${pageId} (${isTypeScript ? 'TypeScript' : 'JavaScript'}${isNextJs ? ' + Next.js' : ''})`);
      } catch (e) {
        console.error('Compilation error:', e.message);
        const errorHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Compilation Error</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #f5f5f5; }
    .error { background: #fee; padding: 20px; border-radius: 4px; color: #c00; }
  </style>
</head>
<body>
  <div class="error">
    <h2>Compilation Error</h2>
    <p>${e.message}</p>
    <p><small>${isTypeScript ? 'TypeScript' : 'React'} compilation failed. Check your syntax.</small></p>
  </div>
</body>
</html>`;
        tempPages.set(pageId, errorHtml);
      }
    } else {
      // Store the code as-is (assumed HTML)
      tempPages.set(pageId, code);
      console.log(`✅ Page created: ${pageId} (HTML)`);
    }

    res.json({
      success: true,
      pageId,
      pageUrl,
      message: 'Temporary page created successfully',
    });
  } catch (error) {
    console.error('Error creating page:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /temp/:pageId
 * Serve temporary page
 */
app.get('/temp/:pageId', (req, res) => {
  const { pageId } = req.params;
  const code = tempPages.get(pageId);

  if (!code) {
    return res.status(404).html('<h1>Page not found</h1>');
  }

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(code);
});

/**
 * POST /api/evaluate
 * Evaluate two pages
 */
app.post('/api/evaluate', async (req, res) => {
  try {
    const { expectedUrl, studentCode } = req.body;

    if (!expectedUrl || !studentCode) {
      return res.status(400).json({
        error: 'Both expectedUrl and studentCode are required',
      });
    }

    console.log(`\n🔄 Starting evaluation...`);
    console.log(`  Expected: ${expectedUrl}`);

    // Create temporary page for student code (compile if needed)
    const pageId = `temp_${++pageCounter}_${Date.now()}`;
    const studentUrl = `http://localhost:${PORT}/temp/${pageId}`;

    const { needsCompilation, isNextJs, isTypeScript } = detectComponentType(studentCode);

    if (needsCompilation) {
      try {
        // Transform TypeScript/React to JavaScript
        const transformed = await esbuild.transform(studentCode, { 
          loader: 'tsx', 
          target: 'es2017',
          jsx: 'transform'
        });
        
        const nextJsPolyfill = isNextJs ? `
        const mockRouter = {
          push: (path) => console.log('Navigation to:', path),
          pathname: '/',
          query: {},
          asPath: '/',
          isReady: true
        };
        ` : '';

        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Student App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    #root { min-height: 100vh; }
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <script>
    try {
      const exports = {}; 
      const module = { exports };
      ${nextJsPolyfill}
      if (!window.__NEXT_ROUTER__) {
        window.__NEXT_ROUTER__ = { useRouter: () => mockRouter };
      }
      ${transformed.code}
      const Component = module.exports.default || module.exports;
      if (typeof Component === 'function') {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Component));
      }
    } catch (error) {
      console.error('Runtime error:', error);
      document.getElementById('root').innerHTML = '<pre style="color:red;padding:20px;">Error: ' + error.message + '</pre>';
    }
  </script>
</body>
</html>`;
        tempPages.set(pageId, html);
        console.log(`  Student: ${studentUrl} (${isTypeScript ? 'TypeScript' : 'JavaScript'}${isNextJs ? ' + Next.js' : ''})`);
      } catch (e) {
        console.error('Compilation error:', e.message);
        const errorHtml = `<!doctype html><html><head><style>body{font-family:monospace;padding:20px;background:#f5f5f5}.error{background:#fee;padding:20px;border-radius:4px;color:#c00}</style></head><body><div class="error"><h2>Compilation Error</h2><p>${e.message}</p></div></body></html>`;
        tempPages.set(pageId, errorHtml);
      }
    } else {
      tempPages.set(pageId, studentCode);
      console.log(`  Student: ${studentUrl} (HTML)`);
    }

    // Run evaluation
    const result = await evaluatePages(expectedUrl, studentUrl);

    console.log(`✅ Evaluation complete!\n`);

    res.json({
      success: true,
      result,
      studentPageId: pageId,
    });
  } catch (error) {
    console.error('❌ Evaluation error:', error);
    res.status(500).json({
      error: error.message,
      success: false,
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Web Page Evaluation Engine is running',
    version: '1.0.0',
  });
});

/**
 * Serve index.html for root path
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Middleware error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log('🚀 Web Page Evaluation Engine - Frontend Server');
  console.log(`${'='.repeat(60)}`);
  console.log(`\n✅ Server running at http://localhost:${PORT}`);
  console.log(`📝 Open in browser to start evaluating pages`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  POST /api/create-page - Create temporary page`);
  console.log(`  POST /api/evaluate - Evaluate pages`);
  console.log(`  GET /api/health - Health check`);
  console.log(`\n${'='.repeat(60)}\n`);
});

export default app;
