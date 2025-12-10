import express from "express";
import dotenv from "dotenv";
import { registerHandlers } from "./tools.js";

dotenv.config();

const app = express();
app.use(express.json());

// ============================================================================
// Cargar tools desde tools.js
// ============================================================================
const TOOLS = {};

function loadTools() {
  const collector = {
    tool(name, schema, handler) {
      TOOLS[name] = { schema, handler };
    },
    registerCapabilities() {}
  };

  registerHandlers(collector);
}

loadTools();

// ============================================================================
// listTools helper (GET y POST deben devolver lo mismo)
// ============================================================================
function listTools(req, res) {
  const toolsList = Object.entries(TOOLS).map(([name, { schema }]) => ({
    name,
    description: schema.description || "",
    input_schema: schema.inputSchema || schema.input_schema || {}
  }));

  res.json({ tools: toolsList });
}

// ============================================================================
// /mcp (metadata) — GET y POST
// ============================================================================
app.get("/mcp", (req, res) => {
  res.json({
    protocol: "MCP",
    version: "0.1",
    capabilities: { tools: {} }
  });
});

app.post("/mcp", (req, res) => {
  res.json({
    protocol: "MCP",
    version: "0.1",
    capabilities: { tools: {} }
  });
});

// ============================================================================
// /mcp/tools — GET y POST
// ============================================================================
app.get("/mcp/tools", listTools);
app.post("/mcp/tools", listTools);

// ============================================================================
// /mcp/call — POST (Agent Builder usa solo POST)
// ============================================================================
app.post("/mcp/call", async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    if (!TOOLS[name]) {
      return res.status(400).json({ error: `Tool '${name}' not found` });
    }

    const { handler } = TOOLS[name];
    const result = await handler(args || {});

    res.json(result);

  } catch (err) {
    res.status(500).json({
      error: "Tool execution error",
      message: err.message,
      stack: err.stack
    });
  }
});

// ============================================================================
// Arrancar servidor
// ============================================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 MCP HTTP server ready on port ${PORT}`);
});
