# Compiler service

An isolated HTTP service that compiles a single LaTeX source file with Tectonic's untrusted mode. The application API should be its only caller.

## API

`POST /compile` with `Content-Type: application/json`:

```json
{ "source": "\\documentclass{article}\\begin{document}Hello\\end{document}" }
```

Successful responses include `pdfBase64`, cache metadata, engine metadata, duration, and structured diagnostics. Compilation failures return HTTP 422 with diagnostics. Invalid or oversized input returns 400/413. `GET /health` is available for health checks.

## Security boundary

Tectonic runs without a shell and with `--untrusted`, `--only-cached`, and `TECTONIC_UNTRUSTED_MODE=1`. Common resume packages are fetched during the image build, while runtime compilation is offline. Each request gets an ephemeral working directory. Source, request, output, diagnostic, and execution-time limits are configurable. The supplied Compose definition adds the remaining container controls: a read-only root filesystem, tmpfs, non-root user, dropped capabilities, PID/CPU/RAM limits, and configurable network isolation.

For local development, the Compose network allows the host API to reach the published port at `127.0.0.1:8080`. Internal-only networks can prevent Docker from publishing that port. For a deployment where the API shares the compiler's Docker network, set `COMPILER_INTERNAL_NETWORK=true`, use `COMPILER_URL=http://compiler:8080`, and remove the compiler's host port mapping. This blocks external network access from the compiler container.

The package bundle should be pre-warmed and pinned before production deployment. Change `PACKAGE_BUNDLE_VERSION` whenever that bundle changes so cached PDFs cannot cross bundle versions.

The image warms the packages used by RenderCV resumes, makes the cached formats readable by the runtime user, and checks offline compilation as that user during the image build. Changes to the warmup or cache permissions require rebuilding and recreating the compiler container; restarting the existing container keeps the old bundle.

## Configuration

Environment variables: `PORT`, `HOST`, `MAX_SOURCE_BYTES`, `MAX_REQUEST_BYTES`, `MAX_PDF_BYTES`, `MAX_DIAGNOSTIC_BYTES`, `COMPILE_TIMEOUT_MS`, `COMPILER_CACHE_DIR`, `PACKAGE_BUNDLE_VERSION`, `TECTONIC_BINARY`, and `TECTONIC_VERSION`.
