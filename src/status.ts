import ora from 'ora';
import { config } from './util/config';
import { decode } from 'jsonwebtoken';

export default async function status() {
  const spinner = ora('Checking status').start();

  const token = config.get('token', '') as string;

  if (!token) {
    spinner.fail(`Not logged in`);
    return;
  }

  const decoded = decode(token);

  if (decoded && typeof decoded != 'string') {
    spinner.succeed(`Logged in as ${decoded['full_name']}`);
  } else {
    spinner.fail(`Saved token is invalid`);
  }
}
