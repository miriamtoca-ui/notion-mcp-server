// server-http.js
import express from "express";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server";
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http.js";
import { registerHandlers } from "./tools.js";

dotenv.config();

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // Opcional: healthcheck rápido
  app.get("/", (_req, res) => res.send("Notion MCP HTTP server up"));

  const server = new McpServer({
    name: "notion-mcp-server",
    version: "2.0.0",
  });

  registerHandlers(server);          // ← aquí se registran todas tus tools

  const transport = new HttpServerTransport({
    app,                             // se engancha al Express existente
    path: "/mcp",                    // Agent Builder llamará a https://tu-url/mcp
  });

  await server.connect(transport);   // expone automáticamente /mcp, /mcp/tools, /mcp/call

  const PORT = process.env.PORT || 8080;
  app.listen(PORT, () => {
    console.log(`✅ MCP HTTP server listening on port ${PORT} (path /mcp)`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Failed to start MCP HTTP server:", err);
  process.exit(1);
});