import express from "express";
import { spawn } from "child_process";

const app = express();
app.use(express.json());

// Lanzamos el MCP original (STDIO)
const mcp = spawn("node", ["run-stdio.js"], {
  stdio: ["pipe", "pipe", "pipe"]
});

// Buffer para acumular mensajes del MCP
let buffer = "";

// Acumular salidas del MCP
mcp.stdout.on("data", data => {
  buffer += data.toString();
});

// Endpoint HTTP que Agent Builder llamará
app.post("/mcp", async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);

    // Enviar la petición al MCP por STDIN
    mcp.stdin.write(payload + "\n");

    // Intentar parsear la respuesta hasta que esté completa
    const wait = () => {
      try {
        const json = JSON.parse(buffer);
        buffer = ""; // limpiar buffer
        return res.json(json);
      } catch {
        setTimeout(wait, 10);
      }
    };

    wait();

  } catch (e) {
    res.status(500).json({
      error: "Gateway error",
      details: e.toString()
    });
  }
});

// Puerto Railway
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Gateway MCP running on port ${PORT}`));
