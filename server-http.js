import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server";
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 3000;

// -------------------------------------------------------------------
// Cargamos tu servidor MCP REAL (el de index.js)
// -------------------------------------------------------------------
import "./index.js";  
// Este archivo registra tools en el MCP global del SDK

// -------------------------------------------------------------------
// Creamos el transporte HTTP
// -------------------------------------------------------------------
const app = express();
app.use(express.json());

const transport = new HttpServerTransport(app);

// -------------------------------------------------------------------
// Creamos el servidor MCP HTTP
// -------------------------------------------------------------------
const server = new McpServer({
  name: "notion-mcp-server",
  version: "1.0.0",
});

// IMPORTANTE: registramos capacidades para que Agent Builder vea tools
server.registerCapabilities({
  tools: true
});

// Conectamos el servidor MCP al transporte HTTP
await server.connect(transport);

// -------------------------------------------------------------------
// Arrancamos Express
// -------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ MCP HTTP Server running on port ${PORT}`);
});
