import { createClient } from '@base44/sdk';
import { appParams } from '@/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: 'https://base44.app',
  requiresAuth: false,
  appBaseUrl: appBaseUrl || 'https://base44.app'
});

// Secondary client pointing to the Smart Cleaning Business Agent app.
// Used for Facebook OAuth functions (facebookOAuthExchange, facebookConnectPage)
// which are deployed there and not duplicated in the Ops Hub app.
export const base44Agent = createClient({
  appId: '69df8e010d69651bd8cfd18c',
  token,
  functionsVersion,
  serverUrl: 'https://base44.app',
  requiresAuth: false,
  appBaseUrl: appBaseUrl || 'https://base44.app'
});
