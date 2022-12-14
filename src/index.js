import { PKPWallet } from '@lit-protocol/pkp-ethers.js';
import { joinSignature } from '@ethersproject/bytes';
import { typedSignatureHash } from '@metamask/eth-sig-util';
import { convertHexToUtf8, getTransactionToSign } from './helpers.js';
import { ethers } from 'ethers';

/**
 * The PKP class inherits PKPWallet Signer and adds the ability to respond to Ethereum JSON RPC signing requests.
 *
 * @public
 * @override
 */
class LitPKP extends PKPWallet {
  // -- Public methods --

  /**
   * Sign typed data with PKPWallet Signer
   *
   * @param {Object | string} msgParams message to sign
   *
   * @returns {Promise<string>} signature
   */
  async signTypedData(msgParams) {
    const { types, domain, primaryType, message } = JSON.parse(msgParams);
    if (types.EIP712Domain) {
      delete types.EIP712Domain;
    }
    const signature = await this._signTypedData(domain, types, message);
    return signature;
  }

  /**
   * Handle legacy sign typed data (V1)
   *
   * @param {Object | string} msgParams message to sign
   *
   * @returns {Promise<string>} signature
   */
  async signTypedDataLegacy(msgParams) {
    // https://github.com/MetaMask/eth-sig-util/blob/9f01c9d7922b717ddda3aa894c38fbba623e8bdf/src/sign-typed-data.ts#L435
    const messageHash = typedSignatureHash(msgParams);
    const sig = await this.runLitAction(
      ethers.utils.arrayify(messageHash),
      'sig1'
    );
    const encodedSig = joinSignature({
      r: '0x' + sig.r,
      s: '0x' + sig.s,
      v: sig.recid,
    });
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
    let address = ethers.utils.computeAddress(this.publicKey);
    let addressRequested = null;
    let message = null;
    let msgParams = null;
    let txParams = null;
    let transaction = null;
    let result = null;

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
        // Double check version to use since signTypedData can mean V1 (Metamask) or V3 (WalletConnect)
        // References: https://docs.metamask.io/guide/signing-data.html#a-brief-history
        // https://github.com/WalletConnect/walletconnect-monorepo/issues/546
        if (ethers.utils.isAddress(payload.params[0])) {
          // V3 or V4
          addressRequested = payload.params[0];
          if (address.toLowerCase() !== addressRequested.toLowerCase()) {
            throw new Error(
              'PKPWallet address does not match address requested'
            );
          }
          msgParams = payload.params[1];
          result = await this.signTypedData(msgParams);
        } else {
          // V1
          addressRequested = payload.params[1];
          if (address.toLowerCase() !== addressRequested.toLowerCase()) {
            throw new Error(
              'PKPWallet address does not match address requested'
            );
          }
          msgParams = payload.params[0];
          result = await this.signTypedDataLegacy(msgParams);
        }
        break;
      case 'eth_signTypedData_v1':
        // Params are flipped in V1 - https://medium.com/metamask/scaling-web3-with-signtypeddata-91d6efc8b290
        addressRequested = payload.params[1];
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        msgParams = payload.params[0];
        result = await this.signTypedDataLegacy(msgParams);
        break;
      case 'eth_signTypedData_v3':
      case 'eth_signTypedData_v4':
        addressRequested = payload.params[0];
        if (address.toLowerCase() !== addressRequested.toLowerCase()) {
          throw new Error('PKPWallet address does not match address requested');
        }
        msgParams = payload.params[1];
        result = await this.signTypedData(msgParams);
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
        transaction = getTransactionToSign(txParams);
        const signedTx = await this.signTransaction(transaction);
        result = await this.sendTransaction(signedTx);
        break;
      }
      case 'eth_sendRawTransaction': {
        transaction = payload.params[0];
        result = await this.sendTransaction(transaction);
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

function isSignRequestSupported(payload) {
  const supportedMethods = [
    'eth_sign',
    'personal_sign',
    'eth_signTypedData',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'eth_signTransaction',
    'eth_sendTransaction',
    'eth_sendRawTransaction',
  ];
  return supportedMethods.includes(payload.method);
}

export { LitPKP, isSignRequestSupported };
