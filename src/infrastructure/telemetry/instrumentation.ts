import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Habilitar logs de debug do OpenTelemetry (apenas em desenvolvimento)
if (process.env['NODE_ENV'] !== 'production') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

// Configurar exportador de traces
const traceExporter =
  process.env['OTLP_ENDPOINT'] && process.env['NODE_ENV'] === 'production'
    ? new OTLPTraceExporter({
        url: `${process.env['OTLP_ENDPOINT']}/v1/traces`,
      })
    : new ConsoleSpanExporter();

// Criar SDK do OpenTelemetry
const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'personal-agent',
    [SEMRESATTRS_SERVICE_VERSION]: process.env['npm_package_version'] || '1.0.0',
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Instrumentações automáticas para HTTP, Express, MongoDB, etc.
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-mongodb': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Desabilitar para reduzir overhead
      },
    }),
  ],
});

// Inicializar SDK
sdk.start();

// Garantir shutdown graceful
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down successfully'))
    .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
    .finally(() => process.exit(0));
});

export default sdk;
