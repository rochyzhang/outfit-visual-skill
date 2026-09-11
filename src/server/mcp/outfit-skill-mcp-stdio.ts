import readline from "node:readline";
import { handleMcpJsonRpcMessage } from "@/lib/mcp/outfit-skill-mcp";

const lines = readline.createInterface({
  input: process.stdin,
  output: process.stderr,
  terminal: false
});

function writeMessage(message: unknown) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

lines.on("line", (line) => {
  void (async () => {
    try {
      const parsed = JSON.parse(line);
      const response = await handleMcpJsonRpcMessage(parsed);

      if (response) {
        writeMessage(response);
      }
    } catch (error) {
      writeMessage({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Invalid JSON sent to Outfit Visual Studio Skill MCP adapter.",
          data: error instanceof Error ? error.message : undefined
        }
      });
    }
  })();
});
