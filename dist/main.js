var $b88Bz$litprotocolpkpethers = require("@lit-protocol/pkp-ethers");
var $b88Bz$ethersprojectbytes = require("@ethersproject/bytes");
var $b88Bz$metamaskethsigutil = require("@metamask/eth-sig-util");
var $b88Bz$ethers = require("ethers");

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "LitPKP", () => $fa644cfb69d792fe$export$fe60415693af67d1);
$parcel$export(module.exports, "isSignRequestSupported", () => $fa644cfb69d792fe$export$fc81cf4ce65818e1);




function $0afc200eec60c903$export$e5bf32ffe17fcb58(value) {
    try {
        if ((0, $b88Bz$ethers.ethers).utils.isHexString(value)) return (0, $b88Bz$ethers.ethers).utils.toUtf8String(value);
        return value;
    } catch (e) {
        return value;
    }
}
const $0afc200eec60c903$export$c49a2eedf2923bf5 = (txParams)=>{
    let formattedTx = Object.assign({}, txParams);
    if (formattedTx.gas) delete formattedTx.gas;
    if (formattedTx.from) delete formattedTx.from;
    return formattedTx;
};



/**
 * The PKP class inherits PKPWallet Signer and adds the ability to respond to Ethereum JSON RPC signing requests.
 */ class $fa644cfb69d792fe$export$fe60415693af67d1 extends (0, $b88Bz$litprotocolpkpethers.PKPWallet) {
    // -- Public methods --
    /**
   * Sign typed data with PKPWallet Signer
   *
   * @param {Object | string} msgParams message to sign
   *
   * @returns {Promise<string>} signature
   */ async signTypedData(msgParams) {
        const { types: types , domain: domain , primaryType: primaryType , message: message  } = JSON.parse(msgParams);
        if (types.EIP712Domain) delete types.EIP712Domain;
        const signature = await this._signTypedData(domain, types, message);
        return signature;
    }
    /**
   * Handle legacy sign typed data (V1)
   *
   * @param {Object | string} msgParams message to sign
   *
   * @returns {Promise<string>} signature
   */ async signTypedDataLegacy(msgParams) {
        // https://github.com/MetaMask/eth-sig-util/blob/9f01c9d7922b717ddda3aa894c38fbba623e8bdf/src/sign-typed-data.ts#L435
        const messageHash = (0, $b88Bz$metamaskethsigutil.typedSignatureHash)(msgParams);
        const sig = await this.runLitAction((0, $b88Bz$ethers.ethers).utils.arrayify(messageHash), "sig1");
        const encodedSig = (0, $b88Bz$ethersprojectbytes.joinSignature)({
            r: "0x" + sig.r,
            s: "0x" + sig.s,
            v: sig.recid
        });
        return encodedSig;
    }
    /**
   * Use PKPWallet Signer to sign Ethereum JSON-RPC API requests
   *
   * @param {Object} payload Ethereum JSON RPC payload
   *
   * @returns {(Promise<string> | Promise<Object>)} signed message, signed data, signed transaction, or sent transaction
   */ async signEthereumRequest(payload) {
        let address = (0, $b88Bz$ethers.ethers).utils.computeAddress(this.publicKey);
        let addressRequested = null;
        let message = null;
        let msgParams = null;
        let txParams = null;
        let transaction = null;
        let result = null;
        switch(payload.method){
            case "eth_sign":
                addressRequested = payload.params[0];
                if (address.toLowerCase() !== addressRequested.toLowerCase()) throw new Error("PKPWallet address does not match address requested");
                message = (0, $0afc200eec60c903$export$e5bf32ffe17fcb58)(payload.params[1]);
                result = await this.signMessage(message);
                break;
            case "personal_sign":
                addressRequested = payload.params[1];
                if (address.toLowerCase() !== addressRequested.toLowerCase()) throw new Error("PKPWallet address does not match address requested");
                message = (0, $0afc200eec60c903$export$e5bf32ffe17fcb58)(payload.params[0]);
                result = await this.signMessage(message);
                break;
            case "eth_signTypedData":
                // Double check version to use since signTypedData can mean V1 (Metamask) or V3 (WalletConnect)
                // References: https://docs.metamask.io/guide/signing-data.html#a-brief-history
                // https://github.com/WalletConnect/walletconnect-monorepo/issues/546
                if ((0, $b88Bz$ethers.ethers).utils.isAddress(payload.params[0])) {
                    // V3 or V4
                    addressRequested = payload.params[0];
                    if (address.toLowerCase() !== addressRequested.toLowerCase()) throw new Error("PKPWallet address does not match address requested");
                    msgParams = payload.params[1];
                    result = await this.signTypedData(msgParams);
                } else {
                    // V1
                    addressRequested = payload.params[1];
                    if (address.toLowerCase() !== addressRequested.toLowerCase()) throw new Error("PKPWallet address does not match address requested");
                    msgParams = payload.params[0];
                    result = await this.signTypedDataLegacy(msgParams);
                }
                break;
            case "eth_signTypedData_v1":
                // Params are flipped in V1 - https://medium.com/metamask/scaling-web3-with-signtypeddata-91d6efc8b290
                addressRequested = payload.params[1];
                if (address.toLowerCase() !== addressRequested.toLowerCase()) throw new Error("PKPWallet address does not match address requested");
                msgParams = payload.params[0];
                result = await this.signTypedDataLegacy(msgParams);
                break;
            case "eth_signTypedData_v3":
            case "eth_signTypedData_v4":
                addressRequested = payload.params[0];
                if (address.toLowerCase() !== addressRequested.toLowerCase()) throw new Error("PKPWallet address does not match address requested");
                msgParams = payload.params[1];
                result = await this.signTypedData(msgParams);
                break;
            case "eth_signTransaction":
                txParams = payload.params[0];
                addressRequested = txParams.from;
                if (address.toLowerCase() !== addressRequested.toLowerCase()) throw new Error("PKPWallet address does not match address requested");
                transaction = (0, $0afc200eec60c903$export$c49a2eedf2923bf5)(txParams);
                result = await this.signTransaction(transaction);
                break;
            case "eth_sendTransaction":
                {
                    txParams = payload.params[0];
                    addressRequested = txParams.from;
                    if (address.toLowerCase() !== addressRequested.toLowerCase()) throw new Error("PKPWallet address does not match address requested");
                    transaction = (0, $0afc200eec60c903$export$c49a2eedf2923bf5)(txParams);
                    const signedTx = await this.signTransaction(transaction);
                    result = await this.sendTransaction(signedTx);
                    break;
                }
            case "eth_sendRawTransaction":
                transaction = payload.params[0];
                result = await this.sendTransaction(transaction);
                break;
            default:
                throw new Error(`Ethereum JSON-RPC signing method "${payload.method}" is not supported`);
        }
        return result;
    }
}
function $fa644cfb69d792fe$export$fc81cf4ce65818e1(payload) {
    const supportedMethods = [
        "eth_sign",
        "personal_sign",
        "eth_signTypedData",
        "eth_signTypedData_v1",
        "eth_signTypedData_v3",
        "eth_signTypedData_v4",
        "eth_signTransaction",
        "eth_sendTransaction",
        "eth_sendRawTransaction"
    ];
    return supportedMethods.includes(payload.method);
}


//# sourceMappingURL=main.js.map
