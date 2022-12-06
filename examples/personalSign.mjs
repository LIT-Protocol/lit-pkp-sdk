import { LitPKP } from '../index.js';
import { ethers } from 'ethers';
import { address, publicKey, authSig } from './config.js';

// Message to sign
const message = 'Free the web';
const hexMsg = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message));

// personal_sign parameters
// DATA, N Bytes - message to sign.
// DATA, 20 Bytes - address
// Reference: https://metamask.github.io/api-playground/api-documentation/#personal_sign
const payload = {
  method: 'personal_sign',
  params: [hexMsg, address],
};

// Initialize Lit PKP Wallet
const wallet = new LitPKP({
  pkpPubKey: publicKey,
  controllerAuthSig: authSig,
  provider: 'https://rpc-mumbai.maticvigil.com',
});
await wallet.init();

// Sign personal_sign request
const sig = await wallet.signEthereumRequest(payload);

// Verify signature
const recoveredAddr = ethers.utils.verifyMessage(message, sig);
console.log(
  'eth_sign verified? ',
  address.toLowerCase() === recoveredAddr.toLowerCase()
);
