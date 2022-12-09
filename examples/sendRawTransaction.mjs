import { LitPKP } from '../src/index.js';
import { BigNumber } from 'ethers';
import { address, publicKey, authSig } from '../test/config.js';

// Raw transaction to send
const from = address;
const to = address;
const gasLimit = BigNumber.from('21000');
const value = BigNumber.from('10');
const data = '0x';
// pkp-ethers signer will automatically add missing fields (nonce, chainId, gasPrice, gasLimit)
const txParams = {
  from,
  to,
  gasLimit,
  value,
  data,
};

// Initialize Lit PKP Wallet
const wallet = new LitPKP({
  pkpPubKey: publicKey,
  controllerAuthSig: authSig,
  provider: 'https://rpc-mumbai.maticvigil.com',
});
await wallet.init();

const rawTx = await wallet.signTransaction(txParams);

// eth_sendRawTransaction parameters
// Transaction - Object
// Reference: https://ethereum.github.io/execution-apis/api-documentation/#eth_sendRawTransaction
const payload = {
  method: 'eth_sendRawTransaction',
  params: [rawTx],
};

// Handle eth_sendRawTransaction request
const result = await wallet.signEthereumRequest(payload);
console.log('eth_sendRawTransaction result', result);
