import { ethers } from 'ethers';
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';

export function convertHexToUtf8(value) {
  if (ethers.utils.isHexString(value)) {
    return ethers.utils.toUtf8String(value);
  }

  return value;
}

export const getTransactionToSign = txParams => {
  let formattedTx = Object.assign({}, txParams);

  if (formattedTx.gas) {
    delete formattedTx.gas;
  }

  if (formattedTx.from) {
    delete formattedTx.from;
  }

  return formattedTx;
};

export function getSignVersionByMessageFormat(data) {
  // V1 format: name, type, value
  // https://github.com/ethereum/EIPs/pull/712/commits/21abe254fe0452d8583d5b132b1d7be87c0439ca#diff-4a2296091e160bda9c4e9b47f34ea91420677e90d0454ededc48e31314d8642bR62
  if (
    data.length > 0 &&
    data[0]['name'] &&
    data[0]['type'] &&
    data[0]['value']
  ) {
    return SignTypedDataVersion.V1;
  } else {
    // Use encodeData to check if message provided is suitable for V3 or V4
    // https://github.com/MetaMask/eth-sig-util/blob/9f01c9d7922b717ddda3aa894c38fbba623e8bdf/src/sign-typed-data.ts#L193
    try {
      const { types, domain, primaryType, message } = JSON.parse(data);
      // delete types.EIP712Domain;
      const encodedData = TypedDataUtils.encodeData(
        primaryType,
        message,
        types,
        SignTypedDataVersion.V4
      );
      return SignTypedDataVersion.V4;
    } catch (e) {
      return SignTypedDataVersion.V3;
    }
  }
}
