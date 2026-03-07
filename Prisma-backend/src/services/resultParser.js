/**
 * Parse Docker execution output to extract test results.
 *
 * Looks for the pattern:  RESULT x/y
 * where x = passed tests, y = total tests.
 *
 * @param {string} logs  Combined stdout + stderr from Docker execution
 * @returns {{ score: number, passedTests: number, totalTests: number, logs: string }}
 */
export function parseResult(logs) {
    const match = logs.match(/RESULT\s+(\d+)\/(\d+)/);

    if (!match) {
        return {
            score: 0,
            passedTests: 0,
            totalTests: 0,
            logs,
        };
    }

    const passed = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;

    return {
        score,
        passedTests: passed,
        totalTests: total,
        logs,
    };
}
