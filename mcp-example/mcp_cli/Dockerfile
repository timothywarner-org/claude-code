# DocumentMCP demo server container image.
#
# Runs _http_launch.py, not mcp_server.py directly. mcp_server.py hardcodes
# transport="stdio" for the local CLI chat app and the .mcp.json stdio
# registration; _http_launch.py imports that same mcp object unchanged and
# runs it on Streamable HTTP so it works behind Container Apps ingress.
#
# uv sync installs the full pyproject.toml (anthropic, prompt-toolkit included
# even though the server itself never calls them). That's an accepted
# trade-off documented in infra/README or the deploy summary, not a lockfile
# split, per repo convention.
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# Copy dependency manifests first so the layer caches across source-only edits.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Now copy the application source.
COPY mcp_server.py _http_launch.py ./

# Final sync installs the project itself (picked up from the two files above).
RUN uv sync --frozen --no-dev

# Streamable HTTP transport. Container Apps injects PORT; FASTMCP_PORT below
# is set to match the container's exposed port. FASTMCP_HOST must be 0.0.0.0
# so the server accepts traffic from the Container Apps ingress proxy, not
# just loopback.
ENV FASTMCP_HOST=0.0.0.0
ENV FASTMCP_PORT=8000
EXPOSE 8000

ENTRYPOINT ["uv", "run", "python", "_http_launch.py"]
