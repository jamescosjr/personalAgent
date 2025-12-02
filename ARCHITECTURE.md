# ARCHITECTURE.md

Visão Geral (DDD)
- Domain: Núcleo com Entities, Value Objects, Policies, Domain Services, Events e interfaces de Repositórios. Puro TypeScript.
- Application: Orquestra Use Cases, coordena transações, integra Domain com Ports. Sem dependência de providers concretos.
- Infrastructure: Adapters/Gateways para Google APIs, Telegram, Mongoose, Logger, Config, Telemetry, Crypto. Implementa interfaces.
- Presentation: Entradas/saídas do sistema (Telegraf Bot, HTTP/Express). Converte DTOs, valida, chama Use Cases e formata respostas.

Estrutura de Pastas
- docs/
- src/
  - domain/
    - entities/
    - value-objects/
    - services/          (domain services puros)
    - policies/          (regras e invariantes)
    - events/
    - repositories/      (interfaces)
    - errors/
  - application/
    - use-cases/
    - dtos/
    - mappers/
    - ports/             (interfaces para infra: ICalendarPort, ILLMPort, IStoragePort)
    - validators/
    - subscribers/       (reação a domain events)
  - infrastructure/
    - config/            (env + schema Zod)
    - logger/            (Pino)
    - telemetry/         (OpenTelemetry setup)
    - persistence/
      - mongodb/         (Mongoose models, repos concretos)
    - external/
      - google/
        - calendar/
        - drive/
        - auth/          (OAuth2)
      - nlp/
        - gemini/
      - telegram/        (client wrapper p/ Telegraf)
    - http/
      - express/         (server, middlewares, error handler)
    - auth/              (session/token management)
    - crypto/            (KMS/local AES-GCM)
    - idempotency/       (store/keys)
  - presentation/
    - bot/
      - telegram/        (Telegraf bot, command handlers)
    - http/
      - controllers/
      - middlewares/
      - routes/
      - presenters/      (transformação p/ resposta)
  - shared/
    - di/                (container/registrations)
    - errors/            (tipos transversais)
    - result/            (Result/Either)
    - utils/
    - constants/
    - types/
- test/
  - unit/
  - integration/
  - e2e/
- scripts/
- docker/
- .github/workflows/

Fluxo de Dados (Exemplo: Agendar Compromisso)
1) Entrada (Presentation)
   - Telegram envia update -> Telegraf Handler extrai texto/áudio -> converte para DTO e valida (Zod).
2) Application
   - UseCase ScheduleAppointment recebe DTO + contexto (userId, timezone).
   - Chama ports:
     - ILLMPort para extrair intenção e parâmetros (título, data/hora, local).
     - IDateTimeInterpreter (domínio) para normalizar data/hora com timezone do usuário.
     - ICalendarPort para verificar conflitos e criar evento.
     - IAppointmentRepository para persistir a entidade.
   - Publica Domain Events (AppointmentScheduled, etc.).
3) Infrastructure
   - GeminiAdapter implementa ILLMPort.
   - GoogleCalendarGateway implementa ICalendarPort.
   - MongooseAppointmentRepository implementa IAppointmentRepository.
   - Logs/Tracing via OpenTelemetry + Pino.
4) Saída (Presentation)
   - Resultado do UseCase é apresentado ao usuário (texto no Telegram).
   - Em ambiguidades, Presentation solicita confirmação.

Integração com Google (OAuth2)
- Scopes mínimos: calendar, calendar.events, drive.file (se anexos/áudio no Drive).
- Tokens por usuário:
  - Armazenados em MongoDB, criptografados (AES-256-GCM).
  - Refresh automático e transparente via google-auth-library.
- Consentimento:
  - Link enviado no Telegram para fluxo de vinculação.
  - Webhook HTTP recebe callback OAuth2 -> associa ao user.

Idempotência e Confiabilidade
- Dedupe key: Telegram update_id + userId.
- Persistência de dedupe com TTL para evitar reprocessamento.
- Outbox opcional para interações externas sensíveis.

Observabilidade
- OpenTelemetry:
  - Traces: http, express, mongodb, telegraf (custom), google client (custom spans).
  - Métricas: latência por use case, taxa de sucesso/falha, consumo de tokens LLM.
- Logs estruturados (Pino) com traceId e userId.

Erros e Tratamento Centralizado
- Presentation/HTTP: middleware de erro converte Application/Domain/Infra Errors para Problem+JSON.
- Presentation/Telegram: interceptor captura erros e envia mensagem amigável.
- Retentativas com backoff exponencial somente para operações idempotentes.

Configuração e Segredos
- 12-factor: configuração via variáveis de ambiente validadas por Zod.
- Segredos (OAuth client secret, crypto key) injetados por ambiente; nunca comitados.

Ambiente de Execução
- Desenvolvimento: polling do Telegram; ngrok para OAuth callback.
- Produção: Webhook do Telegram atrás de HTTPS (reverse proxy), horizontal scaling com idempotência ativa.