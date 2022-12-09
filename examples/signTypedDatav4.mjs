import { LitPKP } from '../src/index.js';
import { ethers } from 'ethers';
import {
  SignTypedDataVersion,
  recoverTypedSignature,
} from '@metamask/eth-sig-util';
import { address, publicKey, authSig } from '../test/config.js';

// Typed data to sign
// Example from https://github.com/MetaMask/test-dapp/blob/main/src/index.js#L1155
const example = {
  domain: {
    chainId: 80001,
    name: 'Ether Mail',
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
    version: '1',
  },
  message: {
    contents: 'Hello, Bob!',
    from: {
      name: 'Cow',
      wallets: [
        '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826',
        '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF',
      ],
    },
    to: [
      {
        name: 'Bob',
        wallets: [
          '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
          '0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
          '0xB0B0b0b0b0b0B000000000000000000000000000',
        ],
      },
    ],
  },
  primaryType: 'Mail',
  types: {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'version', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Mail: [
      { name: 'from', type: 'Person' },
      { name: 'to', type: 'Person[]' },
      { name: 'contents', type: 'string' },
    ],
    Person: [
      { name: 'name', type: 'string' },
      { name: 'wallets', type: 'address[]' },
    ],
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
  method: 'eth_signTypedData_v4',
  params: [address, msgParam],
};

// Sign eth_signTypedData_v4 request
const sig = await wallet.signEthereumRequest(payload);

// Verify signature
const { types, domain, primaryType, message } = JSON.parse(msgParam);
const formattedTypes = Object.assign({}, types);
if (formattedTypes.EIP712Domain) {
  delete formattedTypes.EIP712Domain;
}

const recoveredAddr = ethers.utils.verifyTypedData(
  domain,
  formattedTypes,
  message,
  sig
);
console.log(
  'Check 1: Signed typed data V4 verified?',
  address.toLowerCase() === recoveredAddr.toLowerCase()
);

const recoveredAddr2 = recoverTypedSignature({
  data: example,
  signature: sig,
  version: SignTypedDataVersion.V4,
});
console.log(
  'Check 2: Signed typed data V4 verified?',
  address.toLowerCase() === recoveredAddr2.toLowerCase()
);
