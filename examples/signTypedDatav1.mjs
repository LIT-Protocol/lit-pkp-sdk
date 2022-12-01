import { LitPKP } from '../index.js';
import {
  recoverTypedSignature,
  SignTypedDataVersion,
} from '@metamask/eth-sig-util';

// PKP data
const address = '0x014b9D4B8B369d85E75Ed9e2e6daF28C0d50c364';
const publicKey =
  '0x0439e24fbe3332dd2abe3073f663a58fc74674095e5834ebbe7a86fd52f1cbe54b8268d6426fbd66a6979d787b6848b750f3a64a6354da4616f93a3031f3d44e95';
const authSig = {
  sig: '0x9827a1ec779185fc63122f7c7bfe0f5f8ae1dcc888d5bdbd73ae4c2feb2e132864c3aeca2038490c3084405850216550b91aa8aa584b03e8c25b09e4a8cbe5851b',
  derivedVia: 'web3.eth.personal.sign',
  signedMessage:
    'localhost:3000 wants you to sign in with your Ethereum account:\n0x5B8A8d043f2235a29E4b063c20299050931832Dc\n\n\nURI: http://localhost:3000/\nVersion: 1\nChain ID: 80001\nNonce: QHMRjVHypHsrmv2hF\nIssued At: 2022-11-23T04:34:06.498Z\nExpiration Time: 2022-11-30T04:34:06.496Z',
  address: '0x5B8A8d043f2235a29E4b063c20299050931832Dc',
};

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

// TODO: Not matching
console.log(
  'Signed typed data V1 verified?',
  address.toLowerCase() === recoveredAddr.toLowerCase()
);
