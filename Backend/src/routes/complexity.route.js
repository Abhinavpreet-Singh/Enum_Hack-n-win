/**
 * @fileoverview Routes for the Complexity Analyzer API.
 *
 * Mounted at: /api/v1/complexity
 *
 * Routes:
 *   POST   /analyze              — Analyze code complexity
 *   GET    /job/:queueType/:jobId — Check async job status
 *   GET    /health               — Subsystem health check
 *   GET    /ml/stats             — ML classifier statistics
 *   GET    /ml/export            — Export training data (admin)
 */

import { Router } from 'express';
import {
  analyzeCodeComplexity,
  checkJobStatus,
  getAnalyzerHealth,
  getMLStats,
  exportMLData,
} from '../controllers/complexity.controller.js';

const router = Router();

// ── Public endpoints ────────────────────────────────────────

// Analyze code complexity (rate-limited per user)
router.post('/analyze', analyzeCodeComplexity);

// Check async job status
router.get('/job/:queueType/:jobId', checkJobStatus);

// Health check
router.get('/health', getAnalyzerHealth);

// ── ML endpoints ────────────────────────────────────────────

// ML classifier statistics
router.get('/ml/stats', getMLStats);

// Export training data as CSV (consider adding admin auth middleware)
router.get('/ml/export', exportMLData);

export default router;
