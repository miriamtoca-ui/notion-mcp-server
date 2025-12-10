import express from "express";
import dotenv from "dotenv";
import { registerHandlers } from "./tools.js";

dotenv.config();

const app = express();
app.use(express.json());

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

// --------------------------
// MCP REQUIRED ENDPOINTS
// --------------------------

// 1) initialize
app.post("/mcp/initialize", (req, res) => {
  res.json({
    protocol: "MCP",
    version: "1.0",
    capabilities: {
      tools: {}
    }
  });
});

// 2) list_tools  (THIS IS WHAT WORKFLOWS CALL)
app.post("/mcp/list_tools", (req, res) => {
  const toolsList = Object.entries(TOOLS).map(([name, { schema }]) => ({
    name,
    description: schema.description || "",
    input_schema: schema.inputSchema || schema.input_schema || {}
  }));

  res.json({ tools: toolsList });
});

// 3) call_tool
app.post("/mcp/call_tool", async (req, res) => {
  try {
    const { name, arguments: args } = req.body;

    if (!TOOLS[name]) {
      return res.status(400).json({
        error: `Tool '${name}' not found`
      });
    }

    const { handler } = TOOLS[name];
    const result = await handler(args || {});

    res.json({
      content: result.content || [],
      is_error: false
    });

  } catch (err) {
    res.status(500).json({
      is_error: true,
      error: "Tool execution error",
      message: err.message
    });
  }
});

// -----------------------------------------------------
//  INGEST ENDPOINT  (para recibir JSON del agente)
// -----------------------------------------------------
app.post("/ingest", (req, res) => {
  const data = req.body;

  console.log("📥 JSON recibido del agente:", data);

  // Respuesta al agente
  res.json({ ok: true, message: "JSON recibido correctamente" });
});

// Optional healthche
