// Carrega o .env da raiz do monorepo em dev (se existir). Em produção (Docker),
// as variáveis vêm do ambiente e nenhum arquivo é carregado.
import { existsSync } from 'node:fs';

for (const p of ['.env', '../../.env']) {
  if (existsSync(p)) {
    (process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(p);
    break;
  }
}
