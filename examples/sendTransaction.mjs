import { LitPKP } from '../src/index.js';
import { BigNumber } from 'ethers';
import { address, publicKey, authSig } from '../test/config.js';

// Transaction to sign and send
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

// eth_sendTransaction parameters
// Transaction - Object
// Reference: https://ethereum.github.io/execution-apis/api-documentation/#eth_sendTransaction
const payload = {
  method: 'eth_sendTransaction',
  params: [txParams],
};

// Initialize Lit PKP Wallet
const wallet = new LitPKP({
  pkpPubKey: publicKey,
  controllerAuthSig: authSig,
  provider: 'https://rpc-mumbai.maticvigil.com',
});
await wallet.init();

// Handle eth_sendTransaction request
const result = await wallet.signEthereumRequest(payload);
console.log('eth_sendTransaction result', result);
