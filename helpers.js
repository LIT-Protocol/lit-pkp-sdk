import { ethers } from 'ethers';
import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';

export function convertHexToUtf8(value) {
  try {
    if (ethers.utils.isHexString(value)) {
      return ethers.utils.toUtf8String(value);
    }
    return value;
  } catch (e) {
    return value;
  }
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
  try {
    // V1 format: name, type, value
    // V3 & V4 format: types, primaryType, domain, message
    const { types, domain, primaryType, message } = JSON.parse(data);
    try {
      // Use encodeData to check if message provided is suitable for V3
      const encodedData = TypedDataUtils.encodeData(
        primaryType,
        message,
        types,
        SignTypedDataVersion.V3
      );
      return SignTypedDataVersion.V3;
    } catch (e) {
      // V4 supports arrays and recursive types
      // If the data is formatted for V4, encodeData will throw "Arrays are unimplemented in encodeData: use V4 extension"
      return SignTypedDataVersion.V4;
    }
  } catch (e) {
    return SignTypedDataVersion.V1;
  }
}
