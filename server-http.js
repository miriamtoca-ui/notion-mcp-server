import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server";
import { HttpServerTransport } from "@modelcontextprotocol/sdk/server/http";
import dotenv from "dotenv";
import { registerHandlers } from "./tools.js";


dotenv.config();

const PORT = process.env.PORT || 8080;
const app = express();
app.use(express.json());

// Create HTTP transport for MCP
const transport = new HttpServerTransport(app);

// Create MCP server instance
const server = new McpServer({
  name: "notion-mcp-server",
  version: "1.0.0",
});

// Register tools and handlers
registerHandlers(server);

// Connect MCP server to HTTP transport
await server.connect(transport);

app.listen(PORT, () => {
  console.log(`MCP HTTP Server running on port ${PORT}`);
});
