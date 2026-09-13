# Compiler service

An isolated HTTP service that compiles a single LaTeX source file with Tectonic's untrusted mode. The application API should be its only caller.

## API

`POST /compile` with `Content-Type: application/json`:

```json
{ "source": "\\documentclass{article}\\begin{document}Hello\\end{document}" }
```

Successful responses include `pdfBase64`, cache metadata, engine metadata, duration, and structured diagnostics. Compilation failures return HTTP 422 with diagnostics. Invalid or oversized input returns 400/413. `GET /health` is available for health checks.

## Security boundary

Tectonic runs without a shell and with `--untrusted`, `--only-cached`, and `TECTONIC_UNTRUSTED_MODE=1`. Common resume packages are fetched during the image build, while runtime compilation is offline. Each request gets an ephemeral working directory. Source, request, output, diagnostic, and execution-time limits are configurable. The supplied Compose definition adds the remaining container controls: a read-only root filesystem, tmpfs, non-root user, dropped capabilities, PID/CPU/RAM limits, and an internal-only network.

The package bundle should be pre-warmed and pinned before production deployment. Change `PACKAGE_BUNDLE_VERSION` whenever that bundle changes so cached PDFs cannot cross bundle versions.

## Configuration

Environment variables: `PORT`, `HOST`, `MAX_SOURCE_BYTES`, `MAX_REQUEST_BYTES`, `MAX_PDF_BYTES`, `MAX_DIAGNOSTIC_BYTES`, `COMPILE_TIMEOUT_MS`, `COMPILER_CACHE_DIR`, `PACKAGE_BUNDLE_VERSION`, `TECTONIC_BINARY`, and `TECTONIC_VERSION`.
