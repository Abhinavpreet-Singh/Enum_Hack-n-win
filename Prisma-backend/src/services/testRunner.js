/**
 * Generate a bash test script that runs curl-based API tests.
 *
 * Each entry in `testCommands` follows the format:
 *   "METHOD PATH EXPECTED_STATUS [JSON_BODY]"
 *
 * Examples:
 *   "GET /users 200"
 *   "POST /users 201 {\"name\":\"test\"}"
 *   "DELETE /users/1 204"
 *
 * @param {string[]} testCommands  Array of test command strings
 * @param {number}   port          Port the server listens on inside the container
 * @returns {string} The full contents of tests.sh
 */
export function generateTestScript(testCommands, port = 3000) {
    if (!testCommands || testCommands.length === 0) {
        return [
            "#!/bin/bash",
            'echo "No tests configured"',
            'echo "RESULT 0/0"',
        ].join("\n");
    }

    const lines = [
        "#!/bin/bash",
        "",
        "PASS=0",
        `TOTAL=${testCommands.length}`,
        "",
        'echo "Running API tests..."',
        "",
    ];

    testCommands.forEach((cmd, index) => {
        const parsed = parseTestCommand(cmd);
        const testNum = index + 1;

        let curlCmd;
        if (parsed.method === "GET") {
            curlCmd =
                `curl -s -o /dev/null -w "%{http_code}" ` +
                `http://localhost:${port}${parsed.path}`;
        } else {
            curlCmd = `curl -s -o /dev/null -w "%{http_code}" -X ${parsed.method}`;
            if (parsed.body) {
                curlCmd += ` -H "Content-Type: application/json" -d '${parsed.body}'`;
            }
            curlCmd += ` http://localhost:${port}${parsed.path}`;
        }

        lines.push(`# Test ${testNum}: ${parsed.method} ${parsed.path}`);
        lines.push(`STATUS=$(${curlCmd})`);
        lines.push(`if [ "$STATUS" -eq ${parsed.expectedStatus} ]; then`);
        lines.push(
            `  echo "Test ${testNum} PASS: ${parsed.method} ${parsed.path} -> $STATUS"`,
        );
        lines.push(`  PASS=$((PASS+1))`);
        lines.push(`else`);
        lines.push(
            `  echo "Test ${testNum} FAIL: ${parsed.method} ${parsed.path} -> $STATUS (expected ${parsed.expectedStatus})"`,
        );
        lines.push(`fi`);
        lines.push("");
    });

    lines.push('echo "RESULT $PASS/$TOTAL"');

    return lines.join("\n");
}

/**
 * Parse a test command string into its components.
 * Format: "METHOD PATH STATUS [BODY]"
 */
function parseTestCommand(cmd) {
    const trimmed = cmd.trim();
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(\d+)(?:\s+(.+))?$/);

    if (!match) {
        throw new Error(`Invalid test command format: "${cmd}"`);
    }

    return {
        method: match[1].toUpperCase(),
        path: match[2],
        expectedStatus: parseInt(match[3], 10),
        body: match[4]?.trim() || null,
    };
}
