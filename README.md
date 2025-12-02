# Personal Scheduling Assistant

Assistente Pessoal de Agendamento via Telegram com integração Google Calendar e Gemini AI.

## 📋 Pré-requisitos

- Node.js >= 20.0.0
- MongoDB >= 8.0
- Telegram Bot Token
- Google Cloud Project (Calendar API + OAuth2)
- Google Gemini API Key

## 🚀 Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Editar .env com suas credenciais
nano .env
```

## ⚙️ Configuração

### 1. Telegram Bot

Criar bot no [@BotFather](https://t.me/botfather):

```
/newbot
# Seguir instruções e copiar o token
```

Adicionar ao `.env`:
```env
TELEGRAM_BOT_TOKEN=seu_token_aqui
```

### 2. Google Calendar API

1. Acessar [Google Cloud Console](https://console.cloud.google.com)
2. Criar projeto novo
3. Ativar Google Calendar API
4. Criar credenciais OAuth 2.0
5. Adicionar redirect URI: `http://localhost:3000/auth/google/callback`
6. Baixar credenciais e adicionar ao `.env`:

```env
GOOGLE_CLIENT_ID=seu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REFRESH_TOKEN=seu_refresh_token
```

### 3. Google Gemini AI

1. Acessar [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Criar API Key
3. Adicionar ao `.env`:

```env
GEMINI_API_KEY=sua_api_key_aqui
```

### 4. Encryption Key

Gerar chave de criptografia:

```bash
openssl rand -hex 32
```

Adicionar ao `.env`:
```env
ENCRYPTION_KEY=sua_chave_hex_aqui
```

## 🏃 Execução

### Desenvolvimento (Local)

```bash
# Iniciar MongoDB via Docker
docker-compose up -d mongodb

# Iniciar aplicação em modo watch
npm run dev
```

### Produção (Docker)

```bash
# Build e iniciar todos os serviços
npm run docker:up

# Ver logs
npm run docker:logs

# Parar serviços
npm run docker:down
```

## 🧪 Testes

```bash
# Todos os testes com coverage
npm test

# Apenas unit tests
npm run test:unit

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📝 Scripts Disponíveis

```bash
npm run dev          # Desenvolvimento com hot reload
npm run build        # Build para produção
npm start            # Iniciar em produção
npm run typecheck    # Verificar tipos TypeScript
npm run lint         # Lint código
npm run lint:fix     # Fix problemas de lint
npm run format       # Formatar código
npm run format:check # Verificar formatação
```

## 🏗️ Arquitetura

Projeto segue **Domain-Driven Design (DDD)** com Clean Architecture:

```
src/
├── domain/          # Entidades, regras de negócio, interfaces
├── application/     # Casos de uso, DTOs, orquestração
├── infrastructure/  # Adaptadores externos (Gemini, Google Calendar, MongoDB)
├── presentation/    # Controllers HTTP, rotas
└── shared/          # Utilitários, DI container, types compartilhados
```

## 🔍 Observabilidade

### Logs Estruturados (Pino)

```bash
# Logs em formato JSON
LOG_PRETTY=false npm run dev

# Logs human-readable
LOG_PRETTY=true npm run dev
```

### Tracing (OpenTelemetry + Jaeger)

Acessar Jaeger UI:
```
http://localhost:16686
```

## 📱 Uso do Bot

### Comandos de Texto

```
Agendar reunião amanhã às 14h sobre projeto X
Cancelar reunião de hoje às 15h
Listar compromissos da semana
```

### Comandos de Voz

Enviar mensagem de áudio com comando natural em português.

## 🤝 Contribuindo

1. Fork o projeto
2. Criar feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit mudanças (`git commit -m 'feat: adicionar nova funcionalidade'`)
4. Push para branch (`git push origin feature/nova-funcionalidade`)
5. Abrir Pull Request

## 📄 Licença

MIT

## 👨‍💻 Autor

James Costa Jr. - [@jamescosjr](https://github.com/jamescosjr)
