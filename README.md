# Changelog

## 2023-04-04

- This repo will soon be deprecated as it's being integrated into https://github.com/LIT-Protocol/js-sdk/pull/57 and converted into Typescript


# Lit PKP SDK

Extends [PKPWallet](https://github.com/LIT-Protocol/pkp-ethers/tree/master/packages/wallet) to handle Ethereum JSON RPC requests for signing messages, data, and transactions and sending transactions.

Supports the following signing methods:

- eth_sign
- personal_sign
- eth_signTypedData
- eth_signTypedData_v1
- eth_signTypedData_v3
- eth_signTypedData_v4
- eth_signTransaction
- eth_sendTransaction
- eth_sendRawTransaction

Check out examples [here](https://github.com/LIT-Protocol/lit-pkp-sdk/tree/main/examples).

## Resources

- [PKP ethers.js wallet](https://github.com/LIT-Protocol/pkp-ethers/tree/master/packages/wallet)
- [Ethereum JSON RPC API spec](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_sign)
- [MetaMask signing methods](https://docs.metamask.io/guide/signing-data.html#signing-data-with-metamask)
- [Learn more about Lit Protocol](https://developer.litprotocol.com/)
