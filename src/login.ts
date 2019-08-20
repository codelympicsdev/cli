import ora from 'ora';
import { decode } from 'jsonwebtoken';
import Conf from 'conf';
import express from 'express';
// @ts-ignore
import openurl from 'openurl';

const config = new Conf();
const loginPage =
  'https://auth.codelympics.dev/auth?client_id=5d23b4d2866d0626232bed81';

export default async function login(cmd: { ci: boolean }) {
  const spinner = ora('Starting callback server').start();

  const app = express();

  app.get('/auth_return', (req, res) => {
    res.send('You can now close this page and return to the CLI.');
    server.close();

    const token = req.query['token'];
    if (token) {
      const decoded = decode(token);

      console.log(`Hello ${(decoded as { full_name: string }).full_name}`);

      if (cmd.ci) {
        spinner.succeed(`Recieved token:`);
        console.log(token);
        return;
      }

      config.set('token', token);

      spinner.succeed(`Saved token`);
    } else {
      spinner.fail(`Did not recieve a token.`);
    }
  });

  const server = app.listen('5555', () => {
    openurl.open(loginPage);
    spinner.text = 'Opening login page and waiting for callback: ' + loginPage;
    spinner.render();
  });
}
