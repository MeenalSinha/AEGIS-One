from fastapi import FastAPI
import structlog


def setup_telemetry(app: FastAPI):
    """Configure OpenTelemetry and Prometheus instrumentation."""
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        provider = TracerProvider()
        trace.set_tracer_provider(provider)
        FastAPIInstrumentor.instrument_app(app, tracer_provider=provider)
    except Exception as e:
        structlog.get_logger().warning("Telemetry setup failed (optional)", error=str(e))

    try:
        from prometheus_client import make_asgi_app
        metrics_app = make_asgi_app()
        app.mount("/metrics", metrics_app)
    except Exception as e:
        structlog.get_logger().warning("Prometheus setup failed (optional)", error=str(e))
