import express from "express";
import dotenv from "dotenv";
import { registerHandlers } from "./tools.js";

dotenv.config();

const app = express();
app.use(express.json());

// ============================================================================
//  1) Cargar tools desde tools.js
// ============================================================================

const TOOLS = {};  // aquí guardaremos { name: { schema, handler } }

function loadTools() {
  const collector = {
    tool(name, schema, handler) {
      TOOLS[name] = { schema, handler };
    },
    registerCapabilities() {} // ignoramos, no necesario aquí
  };

  // Ejecuta registerHandlers para rellenar TOOLS
  registerHandlers(collector);
}

loadTools();

// ============================================================================
//  2) Endpoint raíz opcional
// ============================================================================
app.get("/", (_, res) => {
  res.send("MCP HTTP server running");
});

// ============================================================================
//  3) /mcp  (metainformación del servidor)
// ============================================================================
app.get("/mcp", (req, res) => {
  res.json({
    protocol: "MCP",
    version: "0.1",
    capabilities: {
      tools: {}
    }
  });
});

// ============================================================================
//  4) /mcp/tools  (lista de herramientas)
// ============================================================================
app.get("/mcp/tools", (req, res) => {
  const toolsList = Object.entries(TOOLS).map(([name, { schema }]) => ({
    name,
    description: schema.description || "",
    input_schema: schema.inputSchema || schema.input_schema || {}
  }));

  res.json({ tools: toolsList });
});

// ============================================================================
//  5) /mcp/call  (ejecuta una tool)
// ============================================================================
app.post("/mcp/call", async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    if (!TOOLS[name]) {
      return res.status(400).json({
        error: `Tool '${name}' not found`
      });
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
//  6) Arrancar servidor
// ============================================================================
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 MCP HTTP server ready on port ${PORT}`);
});
