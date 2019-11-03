import ora from 'ora';
import { config } from './util/config';

export default async function logout() {
  const spinner = ora('Signing out').start();

  config.delete('token');

  spinner.succeed(`Signed out`);
}
