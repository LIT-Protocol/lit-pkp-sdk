import * as dotenv from 'dotenv';
dotenv.config();

import { LitNodeClient } from '@lit-protocol/lit-node-client';
import { LitPKP } from '../src/index.js';
import { ethers } from 'ethers';
import { SiweMessage } from 'lit-siwe';
import {
  SignTypedDataVersion,
  recoverTypedSignature,
} from '@metamask/eth-sig-util';

// PKP info
const ethWallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const pkpAddress = '0xb5aaad344ee6c2ee85909b7f4e0ba0fb87512391';
const pkpPubKey =
  '0x04c9b9cba2d50581c92c3aaf6328c19aa7419187d8ad0d1efa50d62c916c8db7649b716afb444e3c0de5036826565214b6a15f70e6afb4902910c5d0a820605165';

describe('LitPKP', () => {
  let pkp;

  beforeEach(async () => {
    // Generate session sigs
    const litNodeClient = new LitNodeClient({
      litNetwork: 'serrano',
      debug: true,
    });
    await litNodeClient.connect();

    const authNeededCallback = async ({
      chain,
      resources,
      expiration,
      uri,
    }) => {
      const domain = 'localhost:3000';
      const message = new SiweMessage({
        domain,
        address: ethWallet.address,
        statement: 'Sign a session key to use with Lit Protocol',
        uri,
        version: '1',
        chainId: '1',
        expirationTime: expiration,
        resources,
      });
      const toSign = message.prepareMessage();
      const signature = await ethWallet.signMessage(toSign);

      const authSig = {
        sig: signature,
        derivedVia: 'web3.eth.personal.sign',
        signedMessage: toSign,
        address: ethWallet.address,
      };

      const sessionSig = await litNodeClient.signSessionKey({
        sessionKey: uri,
        pkpPublicKey: pkpPubKey,
        authSig: authSig,
        authMethods: [
          {
            authMethodType: 1,
            accessToken: ethWallet.address,
          },
        ],
        expiration,
        resources,
        chainId: 1,
      });

      return sessionSig;
    };

    const sessionSigs = await litNodeClient.getSessionSigs({
      resources: ['litAction://*'],
      chain: 'ethereum',
      authNeededCallback,
    });

    // Initialize Lit PKP Wallet
    pkp = new LitPKP({
      pkpPubKey: pkpPubKey,
      controllerSessionSigs: sessionSigs,
      provider: 'https://rpc-mumbai.maticvigil.com',
    });
    await pkp.init();
  });

  test('eth_sign', async () => {
    // Message to sign
    const message = 'Hello world';
    const hexMsg = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message));

    // eth_sign parameters
    // DATA, 20 Bytes - address
    // DATA, N Bytes - message to sign
    // Reference: https://ethereum.github.io/execution-apis/api-documentation/#eth_sign
    const payload = {
      method: 'eth_sign',
      params: [pkpAddress, hexMsg],
    };

    // Sign eth_sign request
    const sig = await pkp.signEthereumRequest(payload);

    // Verify signature
    const recoveredAddr = ethers.utils.verifyMessage(message, sig);

    expect(pkpAddress.toLowerCase()).toBe(recoveredAddr.toLowerCase());
  });

  test('personal_sign', async () => {
    // Message to sign
    const message = 'Free the web';
    const hexMsg = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message));

    // personal_sign parameters
    // DATA, N Bytes - message to sign.
    // DATA, 20 Bytes - address
    // Reference: https://metamask.github.io/api-playground/api-documentation/#personal_sign
    const payload = {
      method: 'personal_sign',
      params: [hexMsg, pkpAddress],
    };

    // Sign personal_sign request
    const sig = await pkp.signEthereumRequest(payload);

    // Verify signature
    const recoveredAddr = ethers.utils.verifyMessage(message, sig);

    expect(pkpAddress.toLowerCase()).toBe(recoveredAddr.toLowerCase());
  });

  test('eth_signTypedData request (version not specified)', async () => {
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

    // eth_signTypedData parameters
    // Address - 20 Bytes - Address of the account that will sign the messages.
    // TypedData - Typed structured data to be signed.
    // Reference: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#eth_signtypeddata
    const msgParam = JSON.stringify(example);
    const payload = {
      method: 'eth_signTypedData',
      params: [pkpAddress, msgParam],
    };

    // Sign eth_signTypedData request (version not specified)
    const sig = await pkp.signEthereumRequest(payload);

    // Verify signature
    const { types, domain, primaryType, message } = JSON.parse(msgParam);

    // https://docs.ethers.io/v5/api/utils/signing-key/#utils-verifyTypedData
    const recoveredAddr = ethers.utils.verifyTypedData(
      domain,
      { Person: types.Person, Mail: types.Mail },
      message,
      sig
    );
    expect(pkpAddress.toLowerCase()).toBe(recoveredAddr.toLowerCase());

    // https://metamask.github.io/eth-sig-util/latest/modules.html#recoverTypedSignature
    const recoveredAddr2 = recoverTypedSignature({
      data: example,
      signature: sig,
      version: SignTypedDataVersion.V3,
    });
    expect(pkpAddress.toLowerCase()).toBe(recoveredAddr2.toLowerCase());
  });

  test('eth_signTypedData V1', async () => {
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
      params: [msgParams, pkpAddress],
    };

    // Sign eth_signTypedData_v1 request
    const sig = await pkp.signEthereumRequest(payload);

    // Verify signature
    const recoveredAddr = recoverTypedSignature({
      data: msgParams,
      signature: sig,
      version: SignTypedDataVersion.V1,
    });
    expect(pkpAddress.toLowerCase()).toBe(recoveredAddr.toLowerCase());
  });

  test('eth_signTypedData V3', async () => {
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

    // eth_signTypedData parameters
    // Address - 20 Bytes - Address of the account that will sign the messages.
    // TypedData - Typed structured data to be signed.
    // Reference: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#eth_signtypeddata
    const msgParam = JSON.stringify(example);
    const payload = {
      method: 'eth_signTypedData_v3',
      params: [pkpAddress, msgParam],
    };

    // Sign eth_signTypedData_v3 request
    const sig = await pkp.signEthereumRequest(payload);

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
    expect(pkpAddress.toLowerCase()).toBe(recoveredAddr.toLowerCase());

    // https://metamask.github.io/eth-sig-util/latest/modules.html#recoverTypedSignature
    const recoveredAddr2 = recoverTypedSignature({
      data: example,
      signature: sig,
      version: SignTypedDataVersion.V3,
    });
    expect(pkpAddress.toLowerCase()).toBe(recoveredAddr2.toLowerCase());
  });

  test('eth_signTypedData V4', async () => {
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

    // eth_signTypedData parameters
    // Address - 20 Bytes - Address of the account that will sign the messages.
    // TypedData - Typed structured data to be signed.
    // Reference: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-712.md#eth_signtypeddata
    const msgParam = JSON.stringify(example);
    const payload = {
      method: 'eth_signTypedData_v4',
      params: [pkpAddress, msgParam],
    };

    // Sign eth_signTypedData_v4 request
    const sig = await pkp.signEthereumRequest(payload);

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
    expect(pkpAddress.toLowerCase()).toBe(recoveredAddr.toLowerCase());

    const recoveredAddr2 = recoverTypedSignature({
      data: example,
      signature: sig,
      version: SignTypedDataVersion.V4,
    });
    expect(pkpAddress.toLowerCase()).toBe(recoveredAddr2.toLowerCase());
  });

  test('eth_signTransaction', async () => {
    // Transaction to sign
    const from = pkpAddress;
    const to = pkpAddress;
    const gasLimit = ethers.BigNumber.from('21000');
    const value = ethers.BigNumber.from('10');
    const data = '0x';
    // pkp-ethers signer will automatically add missing fields (nonce, chainId, gasPrice, gasLimit)
    const txParams = {
      from,
      to,
      gasLimit,
      value,
      data,
    };

    // eth_signTransaction parameters
    // Transaction - Object
    // Reference: https://ethereum.github.io/execution-apis/api-documentation/#eth_signTransaction
    const payload = {
      method: 'eth_signTransaction',
      params: [txParams],
    };

    // Sign eth_signTransaction request
    const result = await pkp.signEthereumRequest(payload);
    expect(result).not.toBeNull();
  });

  test('eth_sendTransaction', async () => {
    // Transaction to sign and send
    const from = pkpAddress;
    const to = pkpAddress;
    const gasLimit = ethers.BigNumber.from('21000');
    const value = ethers.BigNumber.from('10');
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

    // Handle eth_sendTransaction request
    const result = await pkp.signEthereumRequest(payload);
    expect(result).not.toBeNull();
  });

  // test('eth_sendRawTransaction', async () => {});
});
