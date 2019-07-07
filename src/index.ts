import * as programm from 'commander';
import { version } from '../package.json';

import login from './login';

programm.version(version);

programm
  .command('login')
  .option('--ci', 'show token rather than saving it')
  .action(login);
programm.parse(process.argv);
