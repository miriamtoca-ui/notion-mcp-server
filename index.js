import { Server as McpServer } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";

dotenv.config();

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = "2b704d5815c48030bf12f039d1a06893"; // Tu BD real

const transport = new StdioServerTransport();

const server = new McpServer({
  name: "notion-mcp-server",
  version: "1.2.0",
});

// ----------------------------------------------------------
// Registrar tools
// ----------------------------------------------------------

server.registerCapabilities({
  tools: {
    values: [
      {
        name: "ping",
        description: "Prueba que el servidor MCP funciona",
        inputSchema: {
          type: "object",
          properties: { message: { type: "string" } },
          required: ["message"],
        },
      },
      {
        name: "create_document",
        description: "Crea un registro completo en Notion. El título es obligatorio.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            type: { type: "string" },
            status: { type: "string" },
            provider: { type: "string" },
            documentDate: { type: "string" },
            registerDate: { type: "string" },
            totalAmount: { type: "number" },
            base: { type: "number" },
            iva: { type: "number" },
            irpf: { type: "number" },
            taxCategory: { type: "string" },
            paymentMethod: { type: "string" },
            driveLink: { type: "string" },
            file: { type: "string" },
            documentId: { type: "string" },
            notes: { type: "string" },
            agentReview: { type: "string" },
            period: { type: "string" }
          },
          required: ["title"]
        }
      },
      {
        name: "get_document",
        description: "Obtiene un registro completo desde Notion",
        inputSchema: {
          type: "object",
          properties: { notionId: { type: "string" } },
          required: ["notionId"]
        }
      },
      {
        name: "update_document",
        description: "Actualiza propiedades de un documento Notion",
        inputSchema: {
          type: "object",
          properties: {
            notionId: { type: "string" },
            title: { type: "string" },
            type: { type: "string" },
            status: { type: "string" },
            provider: { type: "string" },
            documentDate: { type: "string" },
            registerDate: { type: "string" },
            totalAmount: { type: "number" },
            base: { type: "number" },
            iva: { type: "number" },
            irpf: { type: "number" },
            taxCategory: { type: "string" },
            paymentMethod: { type: "string" },
            driveLink: { type: "string" },
            file: { type: "string" },
            documentId: { type: "string" },
            notes: { type: "string" },
            agentReview: { type: "string" },
            period: { type: "string" }
          },
          required: ["notionId"]
        }
      }
    ],
  },
});

// ----------------------------------------------------------
// Funciones auxiliares
// ----------------------------------------------------------

async function notionRequest(method, url, body = null) {
  const response = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: body ? JSON.stringify(body) : null,
  });
  return response.json();
}

function mapProperties(args) {
  return {
    "Título": args.title
      ? { title: [{ text: { content: args.title } }] }
      : undefined,

    "Tipo de documento": args.type ? { select: { name: args.type } } : undefined,
    "Estado": args.status ? { select: { name: args.status } } : undefined,
    "Proveedor": args.provider ? { rich_text: [{ text: { content: args.provider } }] } : undefined,

    "Fecha del documento": args.documentDate ? { date: { start: args.documentDate } } : undefined,
    "Fecha de registro": args.registerDate ? { date: { start: args.registerDate } } : undefined,

    "Importe total": args.totalAmount !== undefined ? { number: args.totalAmount } : undefined,
    "Base imponible": args.base !== undefined ? { number: args.base } : undefined,
    "IVA": args.iva !== undefined ? { number: args.iva } : undefined,
    "IRPF": args.irpf !== undefined ? { number: args.irpf } : undefined,

    "Categoría fiscal": args.taxCategory ? { select: { name: args.taxCategory } } : undefined,
    "Método de pago": args.paymentMethod ? { select: { name: args.paymentMethod } } : undefined,

    "Enlace": args.driveLink ? { url: args.driveLink } : undefined,
    "Archivo": args.file ? { url: args.file } : undefined,

    "ID del documento": args.documentId ? { rich_text: [{ text: { content: args.documentId } }] } : undefined,
    "Notas": args.notes ? { rich_text: [{ text: { content: args.notes } }] } : { rich_text: [] },
    "Revisión agente": args.agentReview ? { rich_text: [{ text: { content: args.agentReview } }] } : undefined,
    "Periodo fiscal": args.period ? { rich_text: [{ text: { content: args.period } }] } : undefined,
  };
}

// ----------------------------------------------------------
// Handler principal
// ----------------------------------------------------------

server._requestHandlers.set("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  // --- PING ---
  if (name === "ping") {
    return { isError: false, content: [{ type: "text", text: `Pong: ${args.message}` }] };
  }

  // --- CREATE DOCUMENT ---
  if (name === "create_document") {

    // VALIDACIÓN ESTRICTA DEL TÍTULO
    if (!args.title || args.title.trim().length < 2) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: "Error: El título es obligatorio y no puede estar vacío."
        }]
      };
    }

    const body = {
      parent: { database_id: DATABASE_ID },
      properties: mapProperties(args)
    };

    const res = await notionRequest("POST", "https://api.notion.com/v1/pages", body);

    // Si Notion devuelve error
    if (res?.object === "error") {
      return {
        isError: true,
        content: [{ type: "text", text: `Error Notion: ${res.message}` }]
      };
    }

    return { isError: false, content: [{ type: "text", text: `Creado correctamente: ${res.url}` }] };
  }

  // --- GET DOCUMENT ---
  if (name === "get_document") {
    const res = await notionRequest("GET", `https://api.notion.com/v1/pages/${args.notionId}`);
    return { isError: false, content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
  }

  // --- UPDATE DOCUMENT ---
  if (name === "update_document") {
    const properties = mapProperties(args);

    // Evitar sobreescritura si no se envía título
    delete properties["Título"];

    const res = await notionRequest("PATCH", `https://api.notion.com/v1/pages/${args.notionId}`, {
      properties,
    });

    return { isError: false, content: [{ type: "text", text: "Actualizado correctamente" }] };
  }

  return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
});

// ----------------------------------------------------------

await server.connect(transport);
console.log("MCP server running (mejorado) 🚀");
