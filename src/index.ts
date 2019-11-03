import program from 'commander';
import { version } from '../package.json';

import login from './login';
import logout from './logout';
import status from './status';
import submit from './run';

program.version(version);

program
  .command('login')
  .option('--ci', 'show token rather than saving it')
  .option('--token [token]', 'save the given token rather than prompting')
  .action(login);

program.command('logout').action(logout);

program.command('status').action(status);

program
  .command('run <challenge_id> <executable>')
  .option(
    '-l, --live',
    'actually submit the result. this can not be undone and can only be done a limited amount of times'
  )
  .action(submit);

program.on('command:*', function() {
  console.error(
    'Invalid command: %s\nSee --help for a list of available commands.',
    program.args.join(' ')
  );
  process.exit(1);
});

program.command('help').action(() => program.outputHelp());

program.parse(process.argv);
if (program.args.length === 0) program.outputHelp();
