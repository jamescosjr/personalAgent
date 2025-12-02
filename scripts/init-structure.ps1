Param()

Write-Host "Criando estrutura de pastas (DDD) ..." -ForegroundColor Cyan

$dirs = @(
  'docs','scripts','docker','.github/workflows',
  'src/domain/entities','src/domain/value-objects','src/domain/services','src/domain/policies','src/domain/events','src/domain/repositories','src/domain/errors',
  'src/application/use-cases','src/application/dtos','src/application/mappers','src/application/ports','src/application/validators','src/application/subscribers',
  'src/infrastructure/config','src/infrastructure/logger','src/infrastructure/telemetry',
  'src/infrastructure/persistence/mongodb',
  'src/infrastructure/external/google/calendar','src/infrastructure/external/google/drive','src/infrastructure/external/google/auth',
  'src/infrastructure/external/nlp/gemini','src/infrastructure/external/telegram',
  'src/infrastructure/http/express',
  'src/infrastructure/auth','src/infrastructure/crypto','src/infrastructure/idempotency',
  'src/presentation/bot/telegram',
  'src/presentation/http/controllers','src/presentation/http/middlewares','src/presentation/http/routes','src/presentation/http/presenters',
  'src/shared/di','src/shared/errors','src/shared/result','src/shared/utils','src/shared/constants','src/shared/types',
  'test/unit/domain','test/unit/application','test/integration/infrastructure','test/integration/presentation','test/e2e'
)

foreach ($d in $dirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

Get-ChildItem -Path src, test -Recurse -Directory | ForEach-Object {
  $hasFiles = (Get-ChildItem $_.FullName -Force | Where-Object { -not $_.PSIsContainer }).Count -gt 0
  if (-not $hasFiles) { New-Item -ItemType File -Force -Path (Join-Path $_.FullName ".gitkeep") | Out-Null }
}

Write-Host "Estrutura criada com sucesso." -ForegroundColor Green