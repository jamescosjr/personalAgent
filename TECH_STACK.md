# TECH_STACK.md

Linguagem/Runtime
- Node.js: 20 LTS
- TypeScript: ^5.6 (strict mode)

Frameworks e Bibliotecas
- HTTP
  - Express: ^5.0
  - Helmet, CORS, express-rate-limit
- Telegram
  - Telegraf: ^4.16
- Banco de Dados
  - MongoDB (Atlas/Local)
  - Mongoose: ^8
- Injeção de Dependência
  - tsyringe: ^4
  - reflect-metadata
- Validação
  - zod: ^3
- Data/Tempo
  - luxon: ^3 (timezone/ISO) ou dayjs + plugins
  - chrono-node: ^2 (parsing NLP de datas)
- Logs
  - pino: ^9
  - pino-pretty (dev)
- Observabilidade
  - @opentelemetry/api: ^1
  - @opentelemetry/sdk-node: ^0.5x
  - @opentelemetry/auto-instrumentations-node: ^0.5x
  - Exporters OTLP (HTTP/GRPC)
  - Instrumentations: http, express, mongodb
- Google
  - googleapis: ^14x (Calendar/Drive)
  - google-auth-library: ^9
  - @google/generative-ai (Gemini SDK): ^0.1x
- Testes
  - vitest: ^1
  - supertest: ^6
  - testcontainers: ^10 (MongoDB em integração)
  - nock: ^13 (mock http)
- Utilidades
  - uuid: ^9
  - dotenv: ^16
  - cross-env
- Qualidade
  - eslint: ^9 (+ @typescript-eslint)
  - prettier
  - husky + lint-staged
  - commitlint + conventional commits

DevOps/Infra
- Docker: Multi-stage (node:20-slim)
- docker-compose (dev): MongoDB, Otel Collector, Jaeger/Tempo, Prometheus/Grafana (opcional)
- GitHub Actions: CI (lint, test, build, scan), CD (build/push image)

Versões Alvo
- Produção foca sempre em versões estáveis com ranges compatíveis (^). Fixar versões em CI por lockfile.
- Node 20.x, TS 5.6.x, Express 5.0.x, Mongoose 8.x, Telegraf 4.16.x, OTel SDK 0.5x, googleapis 14x.

Motivações
- Telegraf: robusto para Telegram, suporta polling/webhook.
- Mongoose: modelagem flexível e maturidade com Mongo.
- OTel: padrão aberto para observabilidade.
- Pino: logs estruturados e alta performance.
- Zod: validação declarativa na borda.
- Gemini SDK: extração de intenção/entidades com LLM de alta qualidade.