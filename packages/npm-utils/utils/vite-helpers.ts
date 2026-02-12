import { isRecord } from './typeguards';

export const applySsrHmrPort = (config: unknown, port: number): void => {
  if (!isRecord(config)) {
    return;
  }

  const environments = config.environments;
  if (!isRecord(environments)) {
    return;
  }

  const ssrEnvironment = environments.ssr;
  if (!isRecord(ssrEnvironment)) {
    return;
  }

  const server = ssrEnvironment.server;
  if (!isRecord(server)) {
    return;
  }

  const hmr = server.hmr;
  if (hmr === false) {
    return;
  }

  if (!isRecord(hmr)) {
    server.hmr = {
      port,
      clientPort: port
    };
    return;
  }

  hmr.port = port;
  hmr.clientPort = port;
};
