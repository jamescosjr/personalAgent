# DOMAIN_RULES.md

Linguagem Ubíqua (Ubiquitous Language)
- Usuário (User): pessoa autenticada no Telegram que vincula sua conta Google.
- Vinculação (Linking): processo de OAuth2 para conceder acesso ao Calendar/Drive.
- Compromisso (Appointment): evento no calendário com título, horário, duração, local e participantes.
- Intenção (Intent): ação inferida a partir de texto/áudio (ex.: criar, atualizar, cancelar).
- Interpretação de Data/Hora (DateTime Interpretation): conversão de expressões naturais (“segunda às 10h”) para intervalos exatos no fuso do usuário.
- Confirmação (Confirmation): quando a intenção ou parâmetros são ambíguos, o sistema solicita confirmação.

Entidades e Value Objects

- User (Entidade, Aggregate Root)
  - Atributos
    - id (UserId)
    - telegramId (TelegramUserId)
    - timezone (TimeZone)
    - locale (Locale)
    - googleAccount (GoogleAccount | null)
    - createdAt (Instant UTC)
    - updatedAt (Instant UTC)
  - Regras
    - timezone obrigatório; default inicial com base no Telegram, ajustável pelo usuário.
    - Cada User pode ter no máximo 1 GoogleAccount vinculado.
  - Eventos
    - UserLinkedToGoogle
    - UserUnlinkedFromGoogle

- GoogleAccount (VO)
  - googleUserId
  - email
  - oauth (EncryptedOAuthTokens)
  - scopesConcedidos (lista)
  - Regras
    - tokens sempre armazenados criptografados.
    - refresh token protegido; renovação automática.

- Appointment (Entidade, Aggregate Root)
  - Atributos
    - id (AppointmentId)
    - userId (UserId)
    - title (Title)
    - description (Description | opcional)
    - dateTime (DateTimeRange)
    - location (Location | opcional)
    - attendees (Attendee[] | opcional)
    - source (CreationSource: user|assistant|import)
    - externalRefs (ExternalRefs: googleCalendarEventId, etc.)
    - status (Scheduled|Cancelled)
    - createdAt/updatedAt (Instant UTC)
  - Invariantes
    - dateTime.start < dateTime.end
    - title não vazio, normalizado
    - timezone aplicado ao gerar instantes UTC
  - Eventos
    - AppointmentScheduled
    - AppointmentUpdated
    - AppointmentCancelled
    - AppointmentConflictDetected (quando detectado conflito no Calendar)

- DateTimeRange (VO)
  - start (ZonedDateTime)
  - end (ZonedDateTime)
  - Regras: end > start; ambos no mesmo timezone ao criar; armazenar em UTC + timezone original.

- Outros VOs
  - TimeZone (IANA, ex.: "America/Sao_Paulo")
  - Title, Description, Location (strings normalizadas, limites de tamanho)
  - Attendee (email validado)
  - Intent (type: create|update|cancel + confidence score)
  - NaturalLanguageText (texto original do usuário para auditoria)

Regras de Negócio

- Vinculação OAuth2 (Google)
  - Requer consentimento explícito; scopes mínimos: calendar, calendar.events, drive.file (se necessário).
  - Tokens armazenados criptografados; rotação/refresh transparente.
  - Sem tokens em logs; mascaramento rigoroso em traces.

- Criação de Compromisso
  - Entrada: intenção "criar", com título e data/hora extraídos por LLM + heurística (chrono-node).
  - Interpretação de data:
    - Expressões relativas (ex.: “segunda”) mapeiam para a próxima ocorrência no timezone do usuário.
    - Horas sem data assumem a próxima ocorrência futura.
    - Ausência de timezone usa TimeZone do User.
    - Duração padrão se não informada (ex.: 30m) e configurável.
  - Conflitos:
    - Consultar Calendar; se conflito, solicitar confirmação ou sugerir próximos horários livres.
  - Confirmação:
    - Se confidence < 0.7, Presentation solicita esclarecimento (título/data/local).
  - Persistência:
    - Persistir Appointment com externalRefs após sucesso no Google Calendar.

- Atualização/Cancelamento
  - Atualização exige referência ao evento (por título + janela temporal ou externalRef).
  - Cancelamento requer confirmação explícita se match for ambíguo.

- Áudio/Transcrição
  - Transcrição ocorre antes da interpretação de intenção.
  - Texto transcrito segue o mesmo pipeline de parsing/validação.

- Política de Privacidade
  - Dados mínimos para cumprir a tarefa.
  - Remoção de PII sensível em logs/traces.

Serviços de Domínio e Portas (Interfaces)
- IDateTimeInterpreter (Domain Service)
  - Normaliza expressões naturais para DateTimeRange, usando timezone do usuário.
- ICalendarPort (Application Port)
  - checkConflicts(range, attendees?) -> ConflictResult
  - createEvent(appointment) -> ExternalRef
  - updateEvent(appointment) -> void
  - cancelEvent(externalRef) -> void
- ILLMPort (Application Port)
  - extractIntent(input: NaturalLanguageText) -> Intent + slots (title, date, duration, location, attendees)
- IAppointmentRepository
  - save(appointment), findById(id), findByExternalRef(ref), upsert(...)
- IUserRepository
  - findByTelegramId, save, linkGoogleAccount, unlinkGoogleAccount
- IIdempotencyStore
  - putIfAbsent(key, ttl) -> boolean

Eventos de Domínio
- UserLinkedToGoogle(userId)
- AppointmentScheduled(appointmentId, userId, externalRef)
- AppointmentUpdated(appointmentId)
- AppointmentCancelled(appointmentId)
- AppointmentConflictDetected(appointmentId, conflicts)

Políticas e Invariantes
- Timezone do usuário obrigatório antes de criar compromissos.
- Nenhuma operação no Calendar sem usuário vinculado ao Google.
- Idempotência obrigatória para operações derivadas de updates do Telegram.

Estratégia de Parsing de Data/Hora
- Pipeline
  1) Heurística (chrono-node) com locale do usuário -> candidatos.
  2) LLM (Gemini) para desambiguação e extração de slots.
  3) Normalização com IDateTimeInterpreter -> DateTimeRange em UTC + TZ.
- Regras
  - “amanhã 10h” => próxima data às 10:00 no TZ do User.
  - “segunda 10-11” => janela 10:00–11:00 próxima segunda.
  - Faltando duração: aplicar default (30m) configurável.
  - Passado: se a data estiver no passado, avançar para próxima ocorrência coerente ou solicitar confirmação.

Métricas de Negócio
- Taxa de agendamentos bem-sucedidos por usuário.
- Taxa de conflitos detectados/evitados.
- Tempo médio de resolução (input -> calendar event).
- Taxa de pedidos com confirmação adicional.

Critérios de Aceite (exemplos)
- Dado um usuário com timezone “America/Sao_Paulo”, quando disser “marcar dentista segunda às 10h 1h”, então deve criar evento na próxima segunda às 10:00 por 1h, sem conflitos, e responder com confirmação.
- Dado um conflito, o sistema deve oferecer pelo menos 3 horários alternativos livres no mesmo período do dia.
- Dado input ambíguo (confidence < 0.7), o sistema pede esclarecimento antes de criar.

Conformidade e Segurança
- Criptografia de tokens (AES-256-GCM) com rotação de chaves suportada.
- Segregação de dados por usuário; princípio do menor privilégio em scopes.
- Retenção mínima de dados necessária para auditoria e reexecução idempotente.