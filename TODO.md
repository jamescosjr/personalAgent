# TODO - Tarefas Pendentes

## 🔥 Crítico (Bloqueadores)

### 1. Corrigir Travamento nos Testes
**Problema:** Jest trava ao executar testes unitários  
**Causa provável:** Conflito entre container TSyringe global e mocks do Jest

**Solução:**
```typescript
// Opção 1: Criar container isolado para testes
// Em tests/unit/application/ProcessCommandUseCase.test.ts

import { container } from 'tsyringe';

beforeEach(() => {
  container.clearInstances();  // Limpar antes de cada teste
  // Registrar mocks no container
});

afterEach(() => {
  container.reset();  // Resetar após cada teste
});
```

**Opção 2:** Remover registro de ProcessCommandUseCase do `src/shared/di/container.ts` e instanciar manualmente no controller.

**Arquivos afetados:**
- `tests/unit/application/ProcessCommandUseCase.test.ts`
- `src/shared/di/container.ts`
- `src/presentation/http/controllers/TelegramController.ts`

---

### 2. Implementar MongooseAppointmentRepository

**Arquivo:** `src/infrastructure/persistence/mongodb/repositories/MongooseAppointmentRepository.ts`

**Checklist:**
- [ ] Criar schema do Mongoose para Appointment
- [ ] Implementar método `save(appointment: Appointment): Promise<void>`
- [ ] Implementar método `update(appointment: Appointment): Promise<void>`
- [ ] Implementar método `findById(id: string): Promise<Appointment | null>`
- [ ] Implementar método `findByExternalRef(externalId: string): Promise<Appointment | null>`
- [ ] Implementar método `findByDateRange(userId: string, start: Date, end: Date): Promise<Appointment[]>`
- [ ] Adicionar índices (userId, externalEventId, dateTime)
- [ ] Registrar no container DI (`src/shared/di/container.ts`)
- [ ] Criar testes de integração com TestContainers

**Schema sugerido:**
```typescript
// src/infrastructure/persistence/mongodb/schemas/AppointmentSchema.ts
import { Schema, model } from 'mongoose';

const AppointmentSchema = new Schema({
  _id: String,
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: String,
  dateTime: {
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true, index: true }
  },
  location: String,
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
  source: { type: String, enum: ['user', 'import'], default: 'user' },
  externalRefs: {
    googleCalendarEventId: { type: String, index: true, sparse: true }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const AppointmentModel = model('Appointment', AppointmentSchema);
```

**Tempo estimado:** 2-3 horas

---

### 3. Implementar User Entity e Repository

#### 3.1 User Entity
**Arquivo:** `src/domain/entities/User.ts`

**Checklist:**
- [ ] Criar classe User com validações
- [ ] Propriedades: id, telegramId, name, googleAccount, createdAt
- [ ] Método `linkGoogleAccount(account: GoogleAccount): void`
- [ ] Método `unlinkGoogleAccount(): void`
- [ ] Testes unitários

**Estrutura:**
```typescript
export interface UserProps {
  id: string;
  telegramId: string;
  name: string;
  googleAccount?: GoogleAccount;
  createdAt?: Date;
}

export class User {
  constructor(props: UserProps) {
    // Validações
    if (!props.telegramId) throw new Error('Telegram ID is required');
    if (!props.name.trim()) throw new Error('Name is required');
  }
  
  linkGoogleAccount(account: GoogleAccount): void { }
  unlinkGoogleAccount(): void { }
  
  // Getters...
}
```

#### 3.2 GoogleAccount Value Object
**Arquivo:** `src/domain/value-objects/GoogleAccount.ts`

**Checklist:**
- [ ] Criar value object imutável
- [ ] Propriedades: email, refreshToken (criptografado), accessToken, expiresAt
- [ ] Método `isExpired(): boolean`
- [ ] Método `equals(other: GoogleAccount): boolean`
- [ ] Testes unitários

#### 3.3 IUserRepository
**Arquivo:** `src/domain/repositories/IUserRepository.ts`

```typescript
export interface IUserRepository {
  save(user: User): Promise<void>;
  update(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
  findByTelegramId(telegramId: string): Promise<User | null>;
  findByGoogleEmail(email: string): Promise<User | null>;
}
```

#### 3.4 MongooseUserRepository
**Arquivo:** `src/infrastructure/persistence/mongodb/repositories/MongooseUserRepository.ts`

**Checklist:**
- [ ] Criar schema do Mongoose
- [ ] Implementar todos os métodos
- [ ] Criptografar refreshToken antes de salvar
- [ ] Descriptografar ao recuperar
- [ ] Registrar no container DI
- [ ] Testes de integração

**Tempo estimado:** 4-5 horas

---

## ⚡ Alto Prioridade

### 4. OAuth2 Flow Completo

#### 4.1 OAuth Controller
**Arquivo:** `src/presentation/http/controllers/OAuthController.ts`

**Checklist:**
- [ ] Método `initiateGoogleAuth(req, res)`
  - Gerar URL de consentimento do Google
  - Armazenar state (CSRF protection)
  - Incluir telegramId no state
- [ ] Método `handleGoogleCallback(req, res)`
  - Validar state
  - Trocar code por tokens (access + refresh)
  - Criar/atualizar User com GoogleAccount
  - Redirecionar para deep link do Telegram

**Estrutura:**
```typescript
@injectable()
export class OAuthController {
  constructor(
    @inject('IUserRepository') private userRepo: IUserRepository,
    @inject('CryptoService') private crypto: CryptoService,
  ) {}
  
  async initiateGoogleAuth(req: Request, res: Response): Promise<void> {
    const { telegramId } = req.query;
    // Gerar URL de consentimento...
  }
  
  async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    const { code, state } = req.query;
    // Trocar code por tokens...
    // Salvar user...
  }
}
```

#### 4.2 OAuth Routes
**Arquivo:** Atualizar `src/presentation/http/routes.ts`

```typescript
router.get('/auth/google', async (req, res) => {
  const oauthController = container.resolve(OAuthController);
  await oauthController.initiateGoogleAuth(req, res);
});

router.get('/auth/google/callback', async (req, res) => {
  const oauthController = container.resolve(OAuthController);
  await oauthController.handleGoogleCallback(req, res);
});
```

#### 4.3 CryptoService
**Arquivo:** `src/infrastructure/crypto/CryptoService.ts`

**Checklist:**
- [ ] Método `encrypt(text: string): string`
- [ ] Método `decrypt(encrypted: string): string`
- [ ] Usar AES-256-GCM
- [ ] Usar ENCRYPTION_KEY do .env
- [ ] Testes unitários

**Tempo estimado:** 3-4 horas

---

### 5. Integration Tests

#### 5.1 GeminiService Integration Test
**Arquivo:** `tests/integration/infrastructure/GeminiService.test.ts`

**Checklist:**
- [ ] Mock com nock para API do Gemini
- [ ] Testar interpretação de texto
- [ ] Testar interpretação de áudio (base64)
- [ ] Testar resposta com baixa confiança
- [ ] Testar erro de API

#### 5.2 GoogleCalendarService Integration Test
**Arquivo:** `tests/integration/infrastructure/GoogleCalendarService.test.ts`

**Checklist:**
- [ ] Mock com nock para Calendar API
- [ ] Testar scheduleEvent
- [ ] Testar checkAvailability
- [ ] Testar listEvents
- [ ] Testar updateEvent
- [ ] Testar cancelEvent
- [ ] Testar refresh de token expirado

#### 5.3 MongoDB Integration Test
**Arquivo:** `tests/integration/infrastructure/MongooseAppointmentRepository.test.ts`

**Checklist:**
- [ ] Usar TestContainers para MongoDB real
- [ ] Testar CRUD completo
- [ ] Testar queries por dateRange
- [ ] Testar índices

**Tempo estimado:** 4-5 horas

---

## 📦 Médio Prioridade

### 6. Melhorias na TelegramController

**Arquivo:** `src/presentation/http/controllers/TelegramController.ts`

**Checklist:**
- [ ] Adicionar comando `/start` com mensagem de boas-vindas
- [ ] Adicionar comando `/help` com instruções
- [ ] Adicionar comando `/link` para iniciar OAuth flow
- [ ] Adicionar botões inline para confirmações
- [ ] Implementar rate limiting por usuário
- [ ] Adicionar typing indicator durante processamento
- [ ] Formatar respostas com Markdown

**Tempo estimado:** 2-3 horas

---

### 7. E2E Tests

**Arquivo:** `tests/e2e/telegram-webhook.test.ts`

**Checklist:**
- [ ] Usar supertest para simular webhook
- [ ] Mockar todas as dependências externas
- [ ] Testar fluxo completo: Telegram → AI → Calendar → Response
- [ ] Testar cenários de erro
- [ ] Verificar logs e tracing

**Tempo estimado:** 3-4 horas

---

### 8. CI/CD Pipeline

**Arquivo:** `.github/workflows/ci.yml`

**Checklist:**
- [ ] Lint + Format check
- [ ] TypeScript type check
- [ ] Run tests com coverage
- [ ] Build Docker image
- [ ] Upload coverage para Codecov
- [ ] Deploy automático (main branch)

**Tempo estimado:** 2-3 horas

---

## 🎨 Baixo Prioridade

### 9. Melhorias de UX

- [ ] Suporte a múltiplos idiomas (i18n)
- [ ] Confirmações antes de cancelar eventos
- [ ] Notificações de lembrete (via Telegram)
- [ ] Visualização de agenda em formato de calendário
- [ ] Suporte a eventos recorrentes

### 10. Performance

- [ ] Cache de tokens do Google Calendar
- [ ] Rate limiting global (Express)
- [ ] Compressão de respostas (gzip)
- [ ] Connection pooling do MongoDB otimizado
- [ ] Lazy loading de dependências pesadas

### 11. Segurança

- [ ] Helmet.js para security headers
- [ ] Validação de entrada com Zod em todos os endpoints
- [ ] Sanitização de logs (remover tokens)
- [ ] HTTPS obrigatório em produção
- [ ] Rotação de ENCRYPTION_KEY

---

## 📊 Estimativa Total

| Prioridade | Tarefas | Tempo Estimado |
|------------|---------|----------------|
| Crítico | 3 | 9-13h |
| Alto | 2 | 7-9h |
| Médio | 2 | 5-7h |
| Baixo | 3 | - |
| **TOTAL MVP** | **7** | **21-29h** |

---

## 🎯 Roadmap Sugerido

### Sprint 1 (Esta Semana) - MVP Funcional
- [x] ~~Presentation Layer e Entry Point~~
- [ ] Corrigir testes travando
- [ ] MongooseAppointmentRepository
- [ ] User entity + repository
- [ ] OAuth2 flow básico

### Sprint 2 (Semana Seguinte) - Testes e Deploy
- [ ] Integration tests completos
- [ ] E2E tests
- [ ] Deploy em produção (Railway/Render)
- [ ] Configurar webhook do Telegram
- [ ] CI/CD básico

### Sprint 3 (Futuro) - Melhorias
- [ ] Comandos avançados do bot
- [ ] Melhorias de UX
- [ ] Performance optimization
- [ ] Security hardening

---

**Última atualização:** 02/12/2025 às 15:45 BRT
