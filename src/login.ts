import * as prompts from 'prompts';
import * as ora from 'ora';
import fetch from 'node-fetch';
import { decode } from 'jsonwebtoken';

const emailMatcher = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default async function login(cmd: { ci: boolean }) {
  const form = await prompts([
    {
      type: 'text',
      name: 'email',
      message: 'Email:',
      validate: value =>
        emailMatcher.test(value.toLowerCase())
          ? true
          : 'The provided email address is not valid',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Password:',
    },
  ]);

  const spinner = ora('Requesting token').start();

  const response = await fetch(`https://api.codelympics.dev/v0/auth/signin`, {
    method: 'POST',
    body: JSON.stringify({
      email: form.email,
      password: form.password,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.headers.get('Content-Type') == 'application/json') {
      spinner.fail(`An error occured: ${(await response.json()).error}`);
    } else {
      spinner.fail(`An error occured: ${await response.text()}`);
    }
    return;
  }

  if (response.headers.get('Content-Type') == 'application/json') {
    let token: string;
    token = (await response.json()).token;
    if (!token) {
      spinner.fail(`An error occured: token is empty`);
      return;
    }

    const decoded = decode(token);

    if (
      decoded &&
      typeof decoded != 'string' &&
      (decoded.requires_upgrade as boolean)
    ) {
      spinner.info(`One time password is required`);

      const form = await prompts({
        type: 'text',
        name: 'otp',
        message: 'OTP:',
      });

      spinner.info(`Validating OTP`);

      const response = await fetch(
        `https://api.codelympics.dev/v0/auth/upgrade/otp`,
        {
          method: 'POST',
          body: JSON.stringify({
            otp: form.otp,
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.headers.get('Content-Type') == 'application/json') {
          spinner.fail(`An error occured: ${(await response.json()).error}`);
        } else {
          spinner.fail(`An error occured: ${await response.text()}`);
        }
        return;
      }

      if (response.headers.get('Content-Type') == 'application/json') {
        token = (await response.json()).token;
        if (!token) {
          spinner.fail(`An error occured: token is empty`);
          return;
        }
      }
    }

    if (cmd.ci) {
      spinner.succeed(`Recieved token:`);
      console.log(token);
      return;
    }

    spinner.succeed(`Saved token`);
  } else {
    spinner.fail(`An error occured: response not json`);
  }
}
