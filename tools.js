// tools.js — versión final estable para MCP HTTP manual
const NOTION_API_BASE = "https://api.notion.com/v1";

// ---------------------------------------------------------------------------
// GET ENVIRONMENT VARIABLES
// ---------------------------------------------------------------------------
function getNotionToken() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error("NOTION_TOKEN is missing — set it in Railway Variables.");
  }
  return token;
}

function getDatabaseId() {
  const id = process.env.NOTION_DATABASE_ID || "2b704d5815c48030bf12f039d1a06893";
  if (!id) {
    throw new Error("NOTION_DATABASE_ID is missing — set it in Railway.");
  }
  return id;
}

// ---------------------------------------------------------------------------
// REGISTER ALL TOOLS
// ---------------------------------------------------------------------------
export function registerHandlers(server) {
  server.registerCapabilities({ tools: {} });

  // -------------------------------------------------------------------------
  // PING
  // -------------------------------------------------------------------------
  server.tool(
    "ping",
    {
      description: "Comprueba si el servidor MCP está vivo",
      input_schema: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"]
      }
    },
    async ({ message }) => ({
      content: [{ type: "text", text: `Pong: ${message}` }]
    })
  );

  // -------------------------------------------------------------------------
  // CREATE DOCUMENT
  // -------------------------------------------------------------------------
  server.tool(
    "create_document",
    {
      description: "Crea un registro completo en Notion. El título es obligatorio.",
      input_schema: documentInputSchema({ requiresId: false })
    },
    async (args) => {
      validateTitle(args.title);

      const body = {
        parent: { database_id: getDatabaseId() },
        properties: mapProperties(args)
      };

      const res = await notionRequest("POST", `${NOTION_API_BASE}/pages`, body);

      return {
        content: [{ type: "text", text: `Creado correctamente: ${res.url}` }]
      };
    }
  );

  // -------------------------------------------------------------------------
  // GET DOCUMENT
  // -------------------------------------------------------------------------
  server.tool(
    "get_document",
    {
      description: "Obtiene un documento completo desde Notion por ID",
      input_schema: {
        type: "object",
        properties: { notionId: { type: "string" } },
        required: ["notionId"]
      }
    },
    async ({ notionId }) => {
      const res = await notionRequest("GET", `${NOTION_API_BASE}/pages/${notionId}`);
      return {
        content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
      };
    }
  );

  // -------------------------------------------------------------------------
  // UPDATE DOCUMENT
  // -------------------------------------------------------------------------
  server.tool(
    "update_document",
    {
      description: "Actualiza propiedades de un documento Notion existente",
      input_schema: documentInputSchema({ requiresId: true })
    },
    async ({ notionId, ...rest }) => {
      const properties = mapProperties(rest);
      delete properties["Título"]; // No sobrescribir título si no viene

      await notionRequest("PATCH", `${NOTION_API_BASE}/pages/${notionId}`, { properties });

      return {
        content: [{ type: "text", text: "Actualizado correctamente" }]
      };
    }
  );
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
async function notionRequest(method, url, body) {
  const NOTION_TOKEN = getNotionToken();

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();

  if (!response.ok || data?.object === "error") {
    throw new Error(data?.message || `Notion API error (${response.status})`);
  }

  return data;
}

function validateTitle(title) {
  if (!title || title.trim().length < 2) {
    throw new Error("El título es obligatorio y no puede estar vacío.");
  }
}

function documentInputSchema({ requiresId }) {
  return {
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
    required: requiresId ? ["notionId"] : ["title"]
  };
}

function mapProperties(args) {
  return {
    "Título": args.title ? { title: [{ text: { content: args.title } }] } : undefined,
    "Tipo de documento": args.type ? { select: { name: args.type } } : undefined,
    "Estado": args.status ? { select: { name: args.status } } : undefined,
    "Proveedor": args.provider ? { rich_text: [{ text: { content: args.provider } }] } : undefined,
    "Fecha del documento": args.documentDate ? { date: { start: args.documentDate } } : undefined,
    "Fecha de registro": args.registerDate ? { date: { start: args.registerDate } } : undefined,
    "Importe total": isNum(args.totalAmount) ? { number: args.totalAmount } : undefined,
    "Base imponible": isNum(args.base) ? { number: args.base } : undefined,
    "IVA": isNum(args.iva) ? { number: args.iva } : undefined,
    "IRPF": isNum(args.irpf) ? { number: args.irpf } : undefined,
    "Categoría fiscal": args.taxCategory ? { select: { name: args.taxCategory } } : undefined,
    "Método de pago": args.paymentMethod ? { select: { name: args.paymentMethod } } : undefined,
    "Enlace": args.driveLink ? { url: args.driveLink } : undefined,
    "Archivo": args.file ? { url: args.file } : undefined,
    "ID del documento": args.documentId ? { rich_text: [{ text: { content: args.documentId } }] } : undefined,
    "Notas": args.notes ? { rich_text: [{ text: { content: args.notes } }] } : { rich_text: [] },
    "Revisión agente": args.agentReview ? { rich_text: [{ text: { content: args.agentReview } }] } : undefined,
    "Periodo fiscal": args.period ? { rich_text: [{ text: { content: args.period } }] } : undefined
  };
}

const isNum = (v) => typeof v === "number" && !Number.isNaN(v);
