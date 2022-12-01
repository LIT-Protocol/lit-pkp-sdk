import { LitPKP } from '../index.js';
import { ethers } from 'ethers';
import {
  SignTypedDataVersion,
  recoverTypedSignature,
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
    Group: [
      { name: 'name', type: 'string' },
      { name: 'members', type: 'Person[]' },
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

const recoveredAddr = ethers.utils.verifyTypedData(
  domain,
  { Person: types.Person, Mail: types.Mail },
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
