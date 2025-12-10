import express from "express";
import dotenv from "dotenv";
import { registerHandlers } from "./tools.js";

dotenv.config();

const app = express();
app.use(express.json());

// Load tools
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

// -----------------------------------------------------------------------------
// MCP 0.1 — initialize
// -----------------------------------------------------------------------------
app.post("/mcp/initialize", (req, res) => {
  res.json({
    protocol: "mcp",
    version: "0.1",
    capabilities: {
      tools: {
        list: true,
        call: true
      }
    }
  });
});

// -----------------------------------------------------------------------------
// MCP 0.1 — list_tools
// -----------------------------------------------------------------------------
app.post("/mcp/list_tools", (req, res) => {
  const tools = Object.entries(TOOLS).map(([name, { schema }]) => ({
    name,
    description: schema.description || "",
    input_schema: schema.inputSchema || schema.input_schema || {}
  }));

  res.json({ tools });
});

// -----------------------------------------------------------------------------
// MCP 0.1 — call_tool
// -----------------------------------------------------------------------------
app.post("/mcp/call_tool", async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    if (!TOOLS[name]) {
      return res.status(400).json({ error: `Unknown tool '${name}'` });
    }

    const { handler } = TOOLS[name];
    const result = await handler(args || {});

    res.json({
      content: result.content || []
    });

  } catch (err) {
    res.status(500).json({
      error: "Tool execution error",
      message: err.message
    });
  }
});

// -----------------------------------------------------------------------------
// Start server
// -----------------------------------------------------------------------------
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 MCP HTTP Server ready on port ${PORT}`);
});
