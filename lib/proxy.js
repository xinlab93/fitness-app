import { ProxyAgent, setGlobalDispatcher } from 'undici';

let configured = false;

export function setupProxy() {
  if (configured) return;
  configured = true;
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.https_proxy ||
    process.env.http_proxy;
  if (proxyUrl) {
    setGlobalDispatcher(new ProxyAgent(proxyUrl));
  }
}
