import express from "express";
import dotenv from "dotenv";
import { registerHandlers } from "./tools.js";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(express.json());

// -----------------------------
//  CONFIGURACIÓN NOTION
// -----------------------------
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_TOKEN) {
  console.error("❌ FALTA NOTION_TOKEN en variables de entorno.");
}
if (!DATABASE_ID) {
  console.error("❌ FALTA NOTION_DATABASE_ID en variables de entorno.");
}

async function createNotionPage(data) {
  const url = "https://api.notion.com/v1/pages";

  const body = {
    parent: { database_id: DATABASE_ID },
    properties: {
      "Título": {
        title: [
          {
            text: { content: data.titulo || "(sin título)" }
          }
        ]
      },
      "Tipo de documento": data.tipo_documento
        ? { rich_text: [{ text: { content: data.tipo_documento } }] }
        : undefined,
      "Fecha del documento": data.fecha_documento
        ? { date: { start: data.fecha_documento } }
        : undefined,
      "Fecha de registro": data.fecha_registro
        ? { date: { start: data.fecha_registro } }
        : undefined,
      "Proveedor": data.proveedor
        ? { rich_text: [{ text: { content: data.proveedor } }] }
        : undefined,
      "Importe total": data.importe_total
        ? { number: parseFloat(data.importe_total) }
        : undefined,
      "Base imponible": data.base_imponible
        ? { number: parseFloat(data.base_imponible) }
        : undefined,
      "IVA": data.iva ? { number: parseFloat(data.iva) } : undefined,
      "IRPF": data.irpf ? { number: parseFloat(data.irpf) } : undefined,
      "Categoría fiscal": data.categoria_fiscal
        ? { rich_text: [{ text: { content: data.categoria_fiscal } }] }
        : undefined,
      "Método de pago": data.metodo_pago
        ? { rich_text: [{ text: { content: data.metodo_pago } }] }
        : undefined,
      "Enlace": data.enlace_archivo
        ? { url: data.enlace_archivo }
        : undefined,
      "Notas": data.notas
        ? { rich_text: [{ text: { content: data.notas } }] }
        : { rich_text: [] }
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();
  return result;
}

// -----------------------------
//  MCP SERVIDOR
// -----------------------------
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

app.post("/mcp/initialize", (req, res) => {
  res.json({
    protocol: "MCP",
    version: "1.0",
    capabilities: {
      tools: {}
    }
  });
});

app.post("/mcp/list_tools", (req, res) => {
  const toolsList = Object.entries(TOOLS).map(([name, { schema }]) => ({
    name,
    description: schema.description || "",
    input_schema: schema.inputSchema || schema.input_schema || {}
  }));

  res.json({ tools: toolsList });
});

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
//  INGEST ENDPOINT  (JSON automático del agente)
// -----------------------------------------------------
app.post("/ingest", async (req, res) => {
  const data = req.body;

  console.log("📥 JSON recibido del agente:", data);

  try {
    const notionResponse = await createNotionPage(data);
    console.log("✅ Página creada en Notion:", notionResponse.url);

    res.json({
      ok: true,
      message: "Documento procesado y enviado correctamente a Notion",
      notion_url: notionResponse.url
    });

  } catch (error) {
    console.error("❌ Error creando página en Notion:", error);

    res.status(500).json({
      ok: false,
      error: "Error creando página en Notion",
      details: error.message
    });
  }
});

// Optional healthcheck
app.get("/", (req, res) => {
  res.send("MCP HTTP server OK");
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 MCP HTTP server ready on port ${PORT}`);
});
