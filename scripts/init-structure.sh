#!/usr/bin/env bash
set -euo pipefail

echo "Criando estrutura de pastas (DDD) ..."

mkdir -p docs scripts docker .github/workflows

mkdir -p src/domain/{entities,value-objects,services,policies,events,repositories,errors}
mkdir -p src/application/{use-cases,dtos,mappers,ports,validators,subscribers}
mkdir -p src/infrastructure/{config,logger,telemetry}
mkdir -p src/infrastructure/persistence/mongodb
mkdir -p src/infrastructure/external/google/{calendar,drive,auth}
mkdir -p src/infrastructure/external/nlp/gemini
mkdir -p src/infrastructure/external/telegram
mkdir -p src/infrastructure/http/express
mkdir -p src/infrastructure/{auth,crypto,idempotency}
mkdir -p src/presentation/bot/telegram
mkdir -p src/presentation/http/{controllers,middlewares,routes,presenters}
mkdir -p src/shared/{di,errors,result,utils,constants,types}

mkdir -p test/{unit,integration,e2e}
mkdir -p test/unit/{domain,application}
mkdir -p test/integration/{infrastructure,presentation}

find src test -type d -empty -exec touch {}/.gitkeep \;

echo "Estrutura criada com sucesso."