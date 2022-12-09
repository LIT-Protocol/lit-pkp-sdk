import { LitPKP } from '../src/index.js';
import {
  recoverTypedSignature,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';
import { address, publicKey, authSig } from '../test/config.js';

// Typed data to sign
// Example from https://github.com/MetaMask/test-dapp/blob/main/src/index.js#L963
const msgParams = [
  {
    type: 'string',
    name: 'Message',
    value: 'Hi, Alice!',
  },
  {
    type: 'uint32',
    name: 'A number',
    value: '1337',
  },
];

// eth_signTypedData_v1 parameters
// TypedData - Typed structured data to be signed.
// Address - 20 Bytes - Address of the account that will sign the messages.
// Reference: https://medium.com/metamask/scaling-web3-with-signtypeddata-91d6efc8b290
const payload = {
  method: 'eth_signTypedData_v1',
  params: [msgParams, address],
};

// Initialize Lit PKP Wallet
const wallet = new LitPKP({
  pkpPubKey: publicKey,
  controllerAuthSig: authSig,
  provider: 'https://rpc-mumbai.maticvigil.com',
});
await wallet.init();

// Sign eth_signTypedData_v1 request
const sig = await wallet.signEthereumRequest(payload);

// Verify signature
const recoveredAddr = recoverTypedSignature({
  data: msgParams,
  signature: sig,
  version: SignTypedDataVersion.V1,
});
console.log(
  'Signed typed data V1 verified?',
  address.toLowerCase() === recoveredAddr.toLowerCase()
);
