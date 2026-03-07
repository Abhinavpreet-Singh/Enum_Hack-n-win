/**
 * Seed script: populates the database with example coding simulations.
 *
 * Usage:
 *   node scripts/seed-simulations.js
 *
 * This script:
 *   1. Connects to MongoDB via Prisma
 *   2. Optionally uploads files to Cloudinary (set UPLOAD_TO_CLOUDINARY=true)
 *   3. Creates simulation documents in the database
 *
 * Environment variables (from .env):
 *   DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */

import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { uploadFileToCloudinary } from "../src/utils/cloudinary.js";

dotenv.config();

const prisma = new PrismaClient();
const UPLOAD_TO_CLOUDINARY = process.env.UPLOAD_TO_CLOUDINARY === "true";

const seedSimulations = [
    {
        title: "Express Route 404 Bug",
        category: "backend",
        difficulty: "easy",
        description:
            "Users report that the GET /api/users endpoint always returns 404. The server starts correctly but routes are not being registered properly.",
        incident:
            "GET /api/users → 404 Not Found. Server logs show no route matching. The route file is imported but never mounted on the Express app.",
        steps: [
            { description: "Read server.js and understand how routes are imported." },
            { description: "Identify why the /api/users route is not responding." },
            { description: "Fix the route mounting and run the server to verify." },
        ],
        entryFile: "server.js",
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();
const userRoutes = require("./routes/users");

app.use(express.json());

// BUG: Routes imported but never mounted
// Missing: app.use("/api/users", userRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
            },
            {
                name: "users.js",
                path: "routes/users.js",
                language: "javascript",
                content: `const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
  ]);
});

router.get("/:id", (req, res) => {
  const user = { id: req.params.id, name: "Test User" };
  res.json(user);
});

module.exports = router;
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();
const userRoutes = require("./routes/users");

app.use(express.json());

// FIX: Mount the routes
app.use("/api/users", userRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
        },
        hints: [
            "The route file is imported at the top of server.js. Is it being used?",
            "Express routes need to be mounted with app.use() to be accessible.",
        ],
        estimatedTime: 10,
        tags: ["Express", "Routing", "Node.js"],
        xpReward: 40,
    },
    {
        title: "Async/Await Error Handling",
        category: "backend",
        difficulty: "medium",
        description:
            "The API crashes with an unhandled promise rejection when the database query fails. Implement proper error handling so the server returns a 500 response instead of crashing.",
        incident:
            "UnhandledPromiseRejectionWarning: Error: ECONNREFUSED — The server crashes when the database is unreachable. No try/catch around the async operation.",
        steps: [
            { description: "Run server.js and observe the crash." },
            { description: "Add try/catch around the async database call." },
            { description: "Return a proper 500 error response to the client." },
        ],
        entryFile: "server.js",
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();
const { getUsers } = require("./db");

app.get("/api/users", async (req, res) => {
  // BUG: No error handling — crashes the server if db fails
  const users = await getUsers();
  res.json(users);
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
            },
            {
                name: "db.js",
                path: "db.js",
                language: "javascript",
                content: `// Simulated database module
async function getUsers() {
  // Simulate a database failure
  throw new Error("ECONNREFUSED: Database connection failed");
}

module.exports = { getUsers };
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();
const { getUsers } = require("./db");

app.get("/api/users", async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (error) {
    console.error("Database error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
        },
        hints: [
            "What happens when an async function throws and there's no catch?",
            "Wrap the await call in a try/catch block and send res.status(500).",
        ],
        estimatedTime: 15,
        tags: ["Async/Await", "Error Handling", "Node.js"],
        xpReward: 60,
    },
    {
        title: "Environment Variable Misconfiguration",
        category: "backend",
        difficulty: "easy",
        description:
            "The server fails to start because it reads the PORT variable incorrectly, resulting in 'undefined' being used. Fix the config module.",
        incident:
            'TypeError: Cannot read properties of undefined — The server tries to listen on "undefined" because process.env.PORT is not loaded from .env.',
        steps: [
            { description: "Check how the config module exports the PORT." },
            { description: "Find why process.env.PORT is undefined." },
            { description: "Fix the config and verify the server starts." },
        ],
        entryFile: "server.js",
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const { PORT } = require("./config");

console.log("Server running on port " + (PORT || 3000));
`,
            },
            {
                name: "config.js",
                path: "config.js",
                language: "javascript",
                content: `// BUG: Exporting the wrong variable name
const PORT = process.env.PORT || 3000;

module.exports = {
  PROT: PORT,  // Typo! Should be PORT
};
`,
            },
            {
                name: ".env",
                path: ".env",
                language: "plaintext",
                content: `PORT=3000
`,
            },
        ],
        solution: {
            "config.js": `const PORT = process.env.PORT || 3000;

module.exports = {
  PORT: PORT,
};
`,
        },
        hints: [
            "Check the export name in config.js — does it match what server.js destructures?",
            'There is a typo: "PROT" instead of "PORT".',
        ],
        estimatedTime: 5,
        tags: ["Config", "Environment", "Node.js"],
        xpReward: 30,
    },
    {
        title: "Middleware Ordering Bug",
        category: "backend",
        difficulty: "medium",
        description:
            "POST requests to /api/data always fail with 'undefined' body. The JSON body parser middleware is loaded after the route handler, so req.body is never populated.",
        incident:
            "POST /api/data → req.body is undefined. Data is sent correctly from the client but the server cannot parse it.",
        steps: [
            { description: "Look at the order of middleware and route declarations." },
            { description: "Move express.json() before the route handlers." },
            { description: "Run and verify req.body is now populated." },
        ],
        entryFile: "server.js",
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();

// Route defined BEFORE body parser — req.body will be undefined
app.post("/api/data", (req, res) => {
  console.log("Body:", req.body);
  if (!req.body || !req.body.name) {
    return res.status(400).json({ error: "Name is required" });
  }
  res.json({ received: req.body });
});

// BUG: Body parser middleware loaded AFTER routes
app.use(express.json());

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();

// FIX: Body parser BEFORE routes
app.use(express.json());

app.post("/api/data", (req, res) => {
  console.log("Body:", req.body);
  if (!req.body || !req.body.name) {
    return res.status(400).json({ error: "Name is required" });
  }
  res.json({ received: req.body });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
        },
        hints: [
            "Express middleware runs in the order it is declared.",
            "Move app.use(express.json()) above the route definition.",
        ],
        estimatedTime: 10,
        tags: ["Express", "Middleware", "Node.js"],
        xpReward: 50,
    },
    {
        title: "Circular Dependency Crash",
        category: "backend",
        difficulty: "hard",
        description:
            "The service crashes on startup due to a circular require between modules A and B. Refactor to break the cycle without changing functionality.",
        incident:
            "TypeError: moduleB.helper is not a function — Circular dependency between moduleA.js and moduleB.js causes one of them to be an empty object at require time.",
        steps: [
            { description: "Trace the require chain between the two modules." },
            { description: "Identify which module gets an incomplete export." },
            { description: "Extract shared logic into a third module to break the cycle." },
        ],
        entryFile: "index.js",
        expectedOutput: "Result: 42\nHelper: ok",
        initialFiles: [
            {
                name: "index.js",
                path: "index.js",
                language: "javascript",
                content: `const { compute } = require("./moduleA");
const { helper } = require("./moduleB");

console.log("Result:", compute(21));
console.log("Helper:", helper());
`,
            },
            {
                name: "moduleA.js",
                path: "moduleA.js",
                language: "javascript",
                content: `// BUG: Circular dependency — moduleA requires moduleB, moduleB requires moduleA
const { helper } = require("./moduleB");

function compute(x) {
  return x * 2;
}

function validate(x) {
  return typeof x === "number" && helper() === "ok";
}

module.exports = { compute, validate };
`,
            },
            {
                name: "moduleB.js",
                path: "moduleB.js",
                language: "javascript",
                content: `// BUG: Circular dependency — moduleB requires moduleA
const { validate } = require("./moduleA");

function helper() {
  return "ok";
}

function process(x) {
  if (validate(x)) return x;
  return null;
}

module.exports = { helper, process };
`,
            },
        ],
        solution: {
            "moduleA.js": `// FIX: Removed direct require of moduleB — shared logic in utils.js
const { helper } = require("./utils");

function compute(x) {
  return x * 2;
}

function validate(x) {
  return typeof x === "number" && helper() === "ok";
}

module.exports = { compute, validate };
`,
            "moduleB.js": `// FIX: Removed direct require of moduleA — uses utils for shared logic
const { helper } = require("./utils");

function process(x) {
  return typeof x === "number" ? x : null;
}

module.exports = { helper, process };
`,
            "utils.js": `// FIX: Extracted shared helper to break circular dependency
function helper() {
  return "ok";
}

module.exports = { helper };
`,
        },
        hints: [
            "When A requires B and B requires A, one of them gets a partial export.",
            "Extract the shared function into a new file that both modules can import.",
        ],
        estimatedTime: 20,
        tags: ["Node.js", "Modules", "Architecture"],
        xpReward: 80,
    },

    // ─── CURL-TEST BACKEND SIMULATIONS ──────────────────────────────────────

    {
        title: "Wrong HTTP Status Codes",
        category: "backend",
        difficulty: "easy",
        description:
            "The REST API for users is mostly working, but it returns incorrect HTTP status codes. POST /api/users returns 200 instead of 201, and DELETE returns 200 instead of 204. Fix the status codes so clients can correctly interpret the responses.",
        incident:
            "POST /api/users → 200 OK (should be 201 Created). DELETE /api/users/:id → 200 OK (should be 204 No Content). REST clients rely on these codes to know whether a resource was created or deleted.",
        steps: [
            { description: "Open server.js and find the POST /api/users handler." },
            { description: "Change res.status(200) to res.status(201) for resource creation." },
            { description: "Find the DELETE handler and change to res.status(204).send() (no body)." },
            { description: "Run the server and verify all three curl tests pass." },
        ],
        entryFile: "server.js",
        testPort: 3000,
        testCommands: [
            "GET /api/users 200",
            "POST /api/users 201 {\"name\":\"Bob\"}",
            "DELETE /api/users/1 204",
        ],
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "package.json",
                path: "package.json",
                language: "json",
                content: `{
  "name": "wrong-status-codes",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2"
  }
}
`,
            },
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();
app.use(express.json());

const users = [{ id: 1, name: "Alice" }];
let nextId = 2;

// GET all users
app.get("/api/users", (req, res) => {
  res.status(200).json(users);
});

// POST — BUG: returns 200 instead of 201 Created
app.post("/api/users", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const user = { id: nextId++, name };
  users.push(user);
  res.status(200).json(user); // BUG: should be 201
});

// DELETE — BUG: returns 200 instead of 204 No Content
app.delete("/api/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  users.splice(idx, 1);
  res.status(200).json({ deleted: true }); // BUG: should be 204 with no body
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();
app.use(express.json());

const users = [{ id: 1, name: "Alice" }];
let nextId = 2;

app.get("/api/users", (req, res) => {
  res.status(200).json(users);
});

app.post("/api/users", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });
  const user = { id: nextId++, name };
  users.push(user);
  res.status(201).json(user); // FIX: 201 Created
});

app.delete("/api/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });
  users.splice(idx, 1);
  res.status(204).send(); // FIX: 204 No Content, no body
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
        },
        hints: [
            "HTTP 201 Created must be used when a new resource is successfully created via POST.",
            "HTTP 204 No Content means success with no response body — use res.status(204).send() not res.json().",
        ],
        estimatedTime: 10,
        tags: ["REST", "HTTP Status Codes", "Express", "Node.js"],
        xpReward: 40,
    },

    {
        title: "Catch-All Handler Returns Wrong Status",
        category: "backend",
        difficulty: "easy",
        description:
            "The products API catches all unknown routes but mistakenly returns a 200 OK status for them. Any URL that doesn't exist should return 404 Not Found. Fix the catch-all middleware to return the correct status code.",
        incident:
            "GET /api/unknownroute → 200 OK (should be 404). Monitoring alerts are silent because the error tracking system filters out 200 responses. Unknown routes silently succeed.",
        steps: [
            { description: "Open server.js and scroll to the bottom to find the catch-all middleware." },
            { description: "Change res.status(200) to res.status(404) in the catch-all handler." },
            { description: "Verify known routes still return 200 and unknown routes now return 404." },
        ],
        entryFile: "server.js",
        testPort: 3000,
        testCommands: [
            "GET /api/products 200",
            "GET /api/products/1 200",
            "GET /api/this-route-does-not-exist 404",
        ],
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "package.json",
                path: "package.json",
                language: "json",
                content: `{
  "name": "catch-all-status",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2"
  }
}
`,
            },
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();
app.use(express.json());

const products = [
  { id: 1, name: "Keyboard", price: 79.99 },
  { id: 2, name: "Mouse",    price: 29.99 },
  { id: 3, name: "Monitor",  price: 299.99 },
];

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// BUG: Catch-all sends 200 OK for all unknown routes
app.use((req, res) => {
  res.status(200).json({ error: "Route not found" }); // BUG: should be 404
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();
app.use(express.json());

const products = [
  { id: 1, name: "Keyboard", price: 79.99 },
  { id: 2, name: "Mouse",    price: 29.99 },
  { id: 3, name: "Monitor",  price: 299.99 },
];

app.get("/api/products", (req, res) => {
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

// FIX: return 404 for all unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
        },
        hints: [
            "Express processes middleware top to bottom. The catch-all app.use() at the bottom handles any request that didn't match a route.",
            "Change status(200) to status(404) in the fallthrough handler.",
        ],
        estimatedTime: 5,
        tags: ["Express", "Middleware", "HTTP Status Codes", "Node.js"],
        xpReward: 30,
    },

    {
        title: "Auth Middleware Always Bypasses",
        category: "backend",
        difficulty: "medium",
        description:
            "A critical security bug: the authentication middleware is supposed to block requests that don't have an Authorization header and return 401 Unauthorized. Instead it always calls next() and lets every request through — including requests to protected admin endpoints.",
        incident:
            "GET /api/admin/users → 200 OK without any token. The requireAuth middleware has the token check commented out and always calls next(). Any unauthenticated user can access protected data.",
        steps: [
            { description: "Open server.js and find the requireAuth middleware function." },
            { description: "Uncomment or add the check: if (!token) return res.status(401).json({ error: 'Unauthorized' })." },
            { description: "Verify that /api/health still returns 200 but /api/dashboard and /api/admin/users return 401 without a token." },
        ],
        entryFile: "server.js",
        testPort: 3000,
        testCommands: [
            "GET /api/health 200",
            "GET /api/dashboard 401",
            "GET /api/admin/users 401",
        ],
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "package.json",
                path: "package.json",
                language: "json",
                content: `{
  "name": "auth-bypass-bug",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2"
  }
}
`,
            },
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();
app.use(express.json());

// BUG: requireAuth does NOT block requests without a token —
//      any unauthenticated request reaches protected routes
function requireAuth(req, res, next) {
  const token = req.headers["authorization"];
  // TOKEN CHECK IS MISSING — this must return 401 if token is absent
  // if (!token) return res.status(401).json({ error: "Unauthorized" });
  console.log("Auth middleware — token:", token || "none");
  next(); // BUG: always passes through regardless of token presence
}

// Public route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: Math.floor(process.uptime()) });
});

// Protected routes — should require a valid Authorization header
app.get("/api/dashboard", requireAuth, (req, res) => {
  res.json({ widgets: 5, alerts: 2, user: "admin" });
});

app.get("/api/admin/users", requireAuth, (req, res) => {
  res.json([
    { id: 1, email: "alice@example.com", role: "admin" },
    { id: 2, email: "bob@example.com",   role: "user" },
  ]);
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();
app.use(express.json());

// FIX: requireAuth now rejects requests without an Authorization header
function requireAuth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: Math.floor(process.uptime()) });
});

app.get("/api/dashboard", requireAuth, (req, res) => {
  res.json({ widgets: 5, alerts: 2, user: "admin" });
});

app.get("/api/admin/users", requireAuth, (req, res) => {
  res.json([
    { id: 1, email: "alice@example.com", role: "admin" },
    { id: 2, email: "bob@example.com",   role: "user" },
  ]);
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
        },
        hints: [
            "The middleware receives req, res, next — it must call res.status(401) when no token is present instead of always calling next().",
            "Uncomment the if (!token) block inside requireAuth to restore the security check.",
        ],
        estimatedTime: 15,
        tags: ["Authentication", "Express", "Security", "Middleware"],
        xpReward: 70,
    },

    {
        title: "Notes CRUD API - Unimplemented Routes",
        category: "backend",
        difficulty: "medium",
        description:
            "The notes API is half-built. GET endpoints work correctly, but POST /api/notes and DELETE /api/notes/:id always return 501 Not Implemented. Complete the implementation so the full CRUD lifecycle works.",
        incident:
            "POST /api/notes → 501 Not Implemented. DELETE /api/notes/:id → 501 Not Implemented. The route stubs exist but the logic inside them is a TODO placeholder.",
        steps: [
            { description: "Open server.js and find the POST /api/notes stub." },
            { description: "Read req.body.text and push a new note object into the notes array with nextId++. Return res.status(201).json(note)." },
            { description: "Find the DELETE /api/notes/:id stub. Parse the id, find the index in notes, splice it out, return res.status(204).send()." },
            { description: "Run the server and verify all three curl tests pass." },
        ],
        entryFile: "server.js",
        testPort: 3000,
        testCommands: [
            "GET /api/notes 200",
            "POST /api/notes 201 {\"text\":\"Learn Node.js\"}",
            "DELETE /api/notes/1 204",
        ],
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "package.json",
                path: "package.json",
                language: "json",
                content: `{
  "name": "notes-crud",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2"
  }
}
`,
            },
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();
app.use(express.json());

let notes = [
  { id: 1, text: "Buy groceries" },
  { id: 2, text: "Walk the dog" },
];
let nextId = 3;

// Working: GET all notes
app.get("/api/notes", (req, res) => {
  res.json(notes);
});

// Working: GET single note
app.get("/api/notes/:id", (req, res) => {
  const note = notes.find(n => n.id === parseInt(req.params.id));
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

// TODO: Implement POST — create a new note from req.body.text, return 201
app.post("/api/notes", (req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

// TODO: Implement DELETE — remove note by id, return 204
app.delete("/api/notes/:id", (req, res) => {
  res.status(501).json({ error: "Not implemented" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();
app.use(express.json());

let notes = [
  { id: 1, text: "Buy groceries" },
  { id: 2, text: "Walk the dog" },
];
let nextId = 3;

app.get("/api/notes", (req, res) => {
  res.json(notes);
});

app.get("/api/notes/:id", (req, res) => {
  const note = notes.find(n => n.id === parseInt(req.params.id));
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

// FIX: Create a new note
app.post("/api/notes", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "text is required" });
  const note = { id: nextId++, text };
  notes.push(note);
  res.status(201).json(note);
});

// FIX: Delete a note by id
app.delete("/api/notes/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return res.status(404).json({ error: "Note not found" });
  notes.splice(idx, 1);
  res.status(204).send();
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
        },
        hints: [
            "For POST: read the text from req.body, build { id: nextId++, text }, push to array, return res.status(201).json(note).",
            "For DELETE: use Array.findIndex() to locate the note. If found, use splice(idx, 1) then res.status(204).send().",
        ],
        estimatedTime: 20,
        tags: ["REST", "CRUD", "Express", "Node.js"],
        xpReward: 60,
    },

    {
        title: "Missing return After res.send Crashes Server",
        category: "backend",
        difficulty: "medium",
        description:
            "The product detail endpoint crashes the server with 'Cannot set headers after they are sent to the client' whenever a non-existent product is requested. The route sends a 404 response but then continues to execute and tries to send another response — causing a fatal crash.",
        incident:
            "GET /api/products/999 → Server crashes with ERR_HTTP_HEADERS_SENT. The 404 branch runs res.status(404).json() but is missing a return statement, so execution falls through and tries to call res.json(undefined) which crashes the process.",
        steps: [
            { description: "Open server.js and find the GET /api/products/:id handler." },
            { description: "Locate every early res.status().json() call that is missing a return statement." },
            { description: "Prepend return to each early response so execution stops after sending the reply." },
            { description: "Verify GET /api/products returns 200 and GET /api/products/999 returns 404." },
        ],
        entryFile: "server.js",
        testPort: 3000,
        testCommands: [
            "GET /api/products 200",
            "GET /api/products/1 200",
            "GET /api/products/999 404",
        ],
        expectedOutput: "Server running on port 3000",
        initialFiles: [
            {
                name: "package.json",
                path: "package.json",
                language: "json",
                content: `{
  "name": "missing-return-bug",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2"
  }
}
`,
            },
            {
                name: "server.js",
                path: "server.js",
                language: "javascript",
                content: `const express = require("express");
const app = express();
app.use(express.json());

const products = [
  { id: 1, name: "Keyboard", stock: 10 },
  { id: 2, name: "Mouse",    stock: 5  },
  { id: 3, name: "Monitor",  stock: 0  },
];

app.get("/api/products", (req, res) => {
  res.json(products);
});

// BUG: Missing return statements cause double-send crash
app.get("/api/products/:id", (req, res) => {
  const id      = parseInt(req.params.id);
  const product = products.find(p => p.id === id);

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    // BUG: Missing return — execution continues after sending 404
  }

  if (product && product.stock === 0) {
    res.status(410).json({ error: "Product is out of stock" });
    // BUG: Missing return — execution continues after sending 410
  }

  res.json(product); // Crashes: headers already sent if product was missing or out of stock
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
            },
        ],
        solution: {
            "server.js": `const express = require("express");
const app = express();
app.use(express.json());

const products = [
  { id: 1, name: "Keyboard", stock: 10 },
  { id: 2, name: "Mouse",    stock: 5  },
  { id: 3, name: "Monitor",  stock: 0  },
];

app.get("/api/products", (req, res) => {
  res.json(products);
});

// FIX: return before each early response
app.get("/api/products/:id", (req, res) => {
  const id      = parseInt(req.params.id);
  const product = products.find(p => p.id === id);

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  if (product.stock === 0) {
    return res.status(410).json({ error: "Product is out of stock" });
  }

  res.json(product);
});

app.listen(3000, () => console.log("Server running on port 3000"));
`,
        },
        hints: [
            "Calling res.json() or res.send() does not stop function execution — you must explicitly return after it to prevent the next line from running.",
            "Change res.status(404).json(...) to return res.status(404).json(...) and do the same for the 410 branch.",
        ],
        estimatedTime: 15,
        tags: ["Express", "Node.js", "Debugging", "Error Handling"],
        xpReward: 60,
    },
];

async function seed() {
    try {
        await prisma.$connect();
        console.log("Connected to MongoDB via Prisma");

        for (const simData of seedSimulations) {
            const existing = await prisma.simulation.findFirst({
                where: { title: simData.title },
            });
            if (existing) {
                console.log(`Skipping "${simData.title}" (already exists)`);
                continue;
            }

            const simulation = await prisma.simulation.create({ data: simData });
            console.log(`Created: "${simulation.title}" (${simulation.id})`);

            if (UPLOAD_TO_CLOUDINARY) {
                console.log(`  Uploading ${simulation.initialFiles.length} file(s) to Cloudinary...`);

                const updatedFiles = [];
                for (const file of simulation.initialFiles) {
                    try {
                        const { url, publicId } = await uploadFileToCloudinary(
                            file.content,
                            file.path,
                            simulation.id,
                        );
                        updatedFiles.push({
                            ...file,
                            cloudinaryUrl: url,
                            cloudinaryPublicId: publicId,
                        });
                        console.log(`    Uploaded: ${file.path}`);
                    } catch (err) {
                        console.error(`    Failed to upload ${file.path}:`, err.message);
                        updatedFiles.push(file);
                    }
                }

                await prisma.simulation.update({
                    where: { id: simulation.id },
                    data: { initialFiles: updatedFiles },
                });
                console.log(`  Cloudinary URLs saved to database`);
            }
        }

        console.log("\nSeeding complete!");
    } catch (err) {
        console.error("Seeding failed:", err);
    } finally {
        await prisma.$disconnect();
        console.log("Disconnected from MongoDB");
    }
}

seed();
