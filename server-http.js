import express from "express";
import { spawn } from "child_process";

const app = express();
app.use(express.json());

// Lanzamos tu MCP (que usa STDIO)
const mcpProcess = spawn("node", ["index.js"], {
  stdio: ["pipe", "pipe", "pipe"]
});

// Para almacenar respuestas parciales del MCP
let buffer = "";

// Recibir datos desde el MCP
mcpProcess.stdout.on("data", (data) => {
  buffer += data.toString();
});

// Endpoint estándar para MCPs HTTP
app.post("/mcp", async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);

    // Enviar al MCP por STDIN
    mcpProcess.stdin.write(payload + "\n");

    // Esperar la respuesta del MCP
    const check = () => {
      try {
        const json = JSON.parse(buffer);
        buffer = ""; // limpiar
        return res.json(json);
      } catch {
        setTimeout(check, 30);
      }
    };

    check();

  } catch (e) {
    res.status(500).json({ error: "Error procesando la solicitud", details: e.toString() });
  }
});

// Puerto para Render/Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("MCP HTTP Gateway running on port", PORT));
