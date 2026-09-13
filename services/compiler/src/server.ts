import { Compiler } from "./compiler.js";
import { loadConfig } from "./config.js";
import { TectonicEngine } from "./engines/tectonic.js";
import { createCompilerServer } from "./http.js";

const config = loadConfig();
const engine = new TectonicEngine(config.tectonicVersion, config.tectonicBinary, config.maxDiagnosticBytes);
const compiler = new Compiler(engine, config);
const server = createCompilerServer(compiler, config);

server.listen(config.port, config.host, () => {
  console.log(`Compiler service listening on ${config.host}:${config.port}`);
});

function shutdown(): void {
  server.close((error) => {
    if (error) {
      console.error("Compiler service shutdown failed", error.message);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
