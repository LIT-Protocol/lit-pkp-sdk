import { LitPKP } from '../index.js';
import { ethers } from 'ethers';
import {
  SignTypedDataVersion,
  recoverTypedSignature,
} from '@metamask/eth-sig-util';
import { address, publicKey, authSig } from './config.js';

// Typed data to sign
// Example from https://github.com/MetaMask/test-dapp/blob/main/src/index.js#L1033
const example = {
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallet', type: 'address' },
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person' },
      { name: 'contents', type: 'string' },
    ],
  },
  primaryType: 'Mail',
  domain: {
    name: 'Ether Mail',
    version: '1',
    chainId: 80001,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  },
  message: {
    from: {
      name: 'Cow',
      wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
    },
    to: {
      name: 'Bob',
      wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
    },
    contents: 'Hello, Bob!',
  },
};

// Initialize Lit PKP Wallet
const wallet = new LitPKP({
  pkpPubKey: publicKey,
  controllerAuthSig: authSig,
  provider: 'https://rpc-mumbai.maticvigil.com',
});
await wallet.init();

// eth_signTypedData parameters
// Address - 20 Bytes - Address of the account that will sign the messages.
// TypedData - Typed structured data to be signed.
// Reference: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#eth_signtypeddata
const msgParam = JSON.stringify(example);
const payload = {
  method: 'eth_signTypedData_v3',
  params: [address, msgParam],
};

// Sign eth_signTypedData_v3 request
const sig = await wallet.signEthereumRequest(payload);

// Verify signature
const { types, domain, primaryType, message } = JSON.parse(msgParam);
const formattedTypes = Object.assign({}, types);
if (formattedTypes.EIP712Domain) {
  delete formattedTypes.EIP712Domain;
}

// https://docs.ethers.io/v5/api/utils/signing-key/#utils-verifyTypedData
const recoveredAddr = ethers.utils.verifyTypedData(
  domain,
  formattedTypes,
  message,
  sig
);
console.log(
  'Check 1: Signed typed data V3 verified?',
  address.toLowerCase() === recoveredAddr.toLowerCase()
);

// https://metamask.github.io/eth-sig-util/latest/modules.html#recoverTypedSignature
const recoveredAddr2 = recoverTypedSignature({
  data: example,
  signature: sig,
  version: SignTypedDataVersion.V3,
});
console.log(
  'Check 2: Signed typed data V3 verified?',
  address.toLowerCase() === recoveredAddr2.toLowerCase()
);
