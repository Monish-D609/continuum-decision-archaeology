import os
import uvicorn

if __name__ == "__main__":
    port_str = os.getenv("PORT", "8000")
    try:
        port = int(port_str)
    except (ValueError, TypeError):
        port = 8000

    is_prod = os.getenv("RENDER") or os.getenv("RAILWAY_ENVIRONMENT")

    print(f"Starting Continuum on 0.0.0.0:{port}  (prod={bool(is_prod)})...")
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=port,
        # Keep TCP connections alive for up to 75s — prevents Render's
        # reverse proxy from issuing a 502 during long LLM synthesis calls.
        timeout_keep_alive=75,
        # Single worker: BM25 index lives in-process memory; forking
        # would create separate indices per worker on the free tier.
        workers=1,
        # Disable reload in production to save RAM.
        reload=not bool(is_prod),
    )

