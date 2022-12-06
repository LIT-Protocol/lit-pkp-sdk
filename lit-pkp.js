import { PKPWallet } from 'pkp-eth-signer';
import { joinSignature } from '@ethersproject/bytes';
import {
  SignTypedDataVersion,
  TypedDataUtils,
  typedSignatureHash,
} from '@metamask/eth-sig-util';
import {
  convertHexToUtf8,
  getSignVersionByMessageFormat,
  getTransactionToSign,
} from './helpers.js';
import { ethers } from 'ethers';

/**
 * The PKP class inherits PKPWallet Signer and adds the ability to respond to Ethereum JSON RPC signing requests.
 *
 * @public
 * @override
 */
export class LitPKP extends PKPWallet {
  // -- Public methods --

  /**
   * Sign typed data with PKPWallet Signer
   *
   * @param {Object} msgParams message to sign
   * @param {SignTypedDataVersion} version method version to use
   *
   * @returns {Promise<string>} signature
   */
  async signTypedData(msgParams, version) {
    let messageHash;
    let signature;
    let encodedSig;

    if (version === SignTypedDataVersion.V1) {
      // https://github.com/MetaMask/eth-sig-util/blob/9f01c9d7922b717ddda3aa894c38fbba623e8bdf/src/sign-typed-data.ts#L435
      messageHash = typedSignatureHash(msgParams);
      signature = await this.runLitAction(
        ethers.utils.arrayify(messageHash),
        'sig1'
      );
      encodedSig = joinSignature({
        r: '0x' + signature.r,
        s: '0x' + signature.s,
        v: signature.recid,
      });
    } else {
      const { types, domain, primaryType, message } = JSON.parse(msgParams);
      const typedData = { types, primaryType, domain, message };
      messageHash = TypedDataUtils.eip712Hash(typedData, version);
      // signature = await this._signTypedData(domain, types, message);
      signature = await this.runLitAction(
        ethers.utils.arrayify(messageHash),
        'sig1'
      );
      encodedSig = joinSignature({
        r: '0x' + signature.r,
        s: '0x' + signature.s,
        v: signature.recid,
      });
    }

    return encodedSig;
  }

  /**
   * Use PKPWallet Signer to sign Ethereum JSON-RPC API requests
   *
   * @param {Object} payload Ethereum JSON RPC payload
   *
   * @returns {(Promise<string> | Promise<Object>)} signed message, signed data, signed transaction, or sent transaction
   */
  async signEthereumRequest(payload) {
    let address = await this.getAddress();
    let addressRequested;
    let message;
    let msgParams;
    let version;
    let txParams;
    let transaction;
    let result;

    switch (payload.method) {
      case 'eth_sign':
        addressRequested = payload.params[0];
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        message = convertHexToUtf8(payload.params[1]);
        result = await this.signMessage(message);
        break;
      case 'personal_sign':
        addressRequested = payload.params[1];
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        message = convertHexToUtf8(payload.params[0]);
        result = await this.signMessage(message);
        break;
      case 'eth_signTypedData':
        addressRequested = payload.params[0];
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        msgParams = payload.params[1];
        version = getSignVersionByMessageFormat(msgParams);
        result = await this.signTypedData(msgParams, version);
        break;
      case 'eth_signTypedData_v1':
        // Params are flipped in V1 - https://medium.com/metamask/scaling-web3-with-signtypeddata-91d6efc8b290
        addressRequested = payload.params[1];
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        msgParams = payload.params[0];
        version = SignTypedDataVersion.V1;
        result = await this.signTypedData(msgParams, version);
        break;
      case 'eth_signTypedData_v3':
        addressRequested = payload.params[0];
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        msgParams = payload.params[1];
        version = SignTypedDataVersion.V3;
        result = await this.signTypedData(msgParams, version);
        break;
      case 'eth_signTypedData_v4':
        addressRequested = payload.params[0];
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        msgParams = payload.params[1];
        version = SignTypedDataVersion.V4;
        result = await this.signTypedData(msgParams, version);
        break;
      case 'eth_signTransaction':
        txParams = payload.params[0];
        addressRequested = txParams.from;
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        transaction = getTransactionToSign(txParams);
        result = await this.signTransaction(transaction);
        break;
      case 'eth_sendTransaction': {
        txParams = payload.params[0];
        addressRequested = txParams.from;
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        // TODO: Temporary patch here to calculate gas limit
        // https://github.com/ethers-io/ethers.js/blob/c80fcddf50a9023486e9f9acb1848aba4c19f7b6/packages/abstract-signer/src.ts/index.ts#L296
        transaction = getTransactionToSign(txParams);
        if (transaction.gasLimit == null) {
          transaction.gasLimit = await this.rpcProvider.estimateGas(
            transaction
          );
        }
        const signedTx = await this.signTransaction(transaction);
        result = await this.sendTransaction(signedTx);
        break;
      }
      default:
        throw new Error(
          `Ethereum JSON-RPC signing method "${payload.method}" is not supported`
        );
    }

    return result;
  }
}

export function isSignRequestSupported(payload) {
  const supportedMethods = [
    'eth_sign',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'eth_signTransaction',
    'eth_sendTransaction',
  ];
  return supportedMethods.includes(payload.method);
}
