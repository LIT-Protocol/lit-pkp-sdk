import { LitPKP } from '../index.js';
import { ethers } from 'ethers';
import { address, publicKey, authSig } from './config.js';

// Message to sign
const message = 'Hello world';
const hexMsg = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message));

// eth_sign parameters
// DATA, 20 Bytes - address
// DATA, N Bytes - message to sign
// Reference: https://ethereum.github.io/execution-apis/api-documentation/#eth_sign
const payload = {
  method: 'eth_sign',
  params: [address, hexMsg],
};

// Initialize Lit PKP Wallet
const wallet = new LitPKP({
  pkpPubKey: publicKey,
  controllerAuthSig: authSig,
  provider: 'https://rpc-mumbai.maticvigil.com',
});
await wallet.init();

// Sign eth_sign request
const sig = await wallet.signEthereumRequest(payload);

// Verify signature
const recoveredAddr = ethers.utils.verifyMessage(message, sig);
console.log(
  'eth_sign verified? ',
  address.toLowerCase() === recoveredAddr.toLowerCase()
);
