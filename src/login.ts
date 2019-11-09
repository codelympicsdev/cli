import ora from 'ora';
import { decode } from 'jsonwebtoken';
import { config } from './util/config';
import express from 'express';
// @ts-ignore
import openurl from 'openurl';
import ClientOAuth2 from 'client-oauth2';

var auth = new ClientOAuth2({
  clientId: '5d23b4d2866d0626232bed81',
  accessTokenUri: 'https://auth.codelympics.dev/oauth2/token',
  authorizationUri: 'https://auth.codelympics.dev/oauth2/auth',
  redirectUri: 'http://localhost:5555/auth_return',
  scopes: [['user.basic', 'challenge.attempt.write'].join(',')],
});

const loginPage = auth.token.getUri();

export default async function login(cmd: { ci: boolean }) {
  const spinner = ora('Starting callback server').start();
  const app = express();

  app.get('/auth_return', async (req, res) => {
    const token = req.query.access_token;
    if (!token) {
      res.send(
        '<script>location.search = location.hash.replace("#", "")</script>'
      );
      return;
    }

    res.send('You can now close this page and return to the CLI.');
    server.close();

    const decoded = decode(token);

    if (cmd.ci) {
      spinner.succeed(`Recieved token:`);
      console.log(token);
      return;
    } else {
      config.set('token', token);
      spinner.succeed(`Hello ${(decoded as { full_name: string }).full_name}`);
    }
  });

  const server = app.listen('5555', () => {
    openurl.open(loginPage);
    spinner.text = 'Opening login page and waiting for callback: ' + loginPage;
    spinner.render();
  });
}
