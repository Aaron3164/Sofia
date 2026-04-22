import { exec } from 'child_process';
import fs from 'fs';

exec('npx tsc --noEmit --project tsconfig.app.json', (error, stdout, stderr) => {
  fs.writeFileSync('tsc-errors.txt', stdout + '\n' + stderr);
});
