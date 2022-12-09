import { ethers } from 'ethers';

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
