const thinNeo = require("nel-neo-thinsdk");

// 配置
const config = {
  neoId: "0xc56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b",
  neoGasId: "0x602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7"
};

// 从wif获取私钥公钥地址等相关信息
function getInfoFromWIF(wif) {
  let prikey = ThinNeo.Helper.GetPrivateKeyFromWIF(wif);
  let pubkey = ThinNeo.Helper.GetPublicKeyFromPrivateKey(prikey);
  let address = ThinNeo.Helper.GetAddressFromPublicKey(pubkey);
  return {
    wif,
    prikey,
    pubkey,
    address
  };
}

// 只转Nep5资产快捷方法
function transferNep5(wif, assertId, toAddr, amount) {
  let address = getInfoFromWIF(wif)["address"];
  let method = "transfer";
  let params = ["(address)" + address, "(address)" + toAddr, "(integer)" + amount];
  return callC(wif, assertId, method, params);
}

// 只转全局资产快捷方法
function transferGlobalCoin(wif, utxos, assertId, toAddr, amount) {
  if (assertId === "neo") {
    assertId = config.neoId;
  }
  if (assertId === "gas") {
    assertId = config.neoGasId;
  }
  let globalCoinParams = {
    assertId,
    amount,
    toAddr,
    utxos
  };
  return callC2(wif, globalCoinParams);
}

// 直接调用合约（与utxo无关）
function callC(wif, scHash, method, params) {
  let prikey = ThinNeo.Helper.GetPrivateKeyFromWIF(wif);
  let pubkey = ThinNeo.Helper.GetPublicKeyFromPrivateKey(prikey);
  let address = ThinNeo.Helper.GetAddressFromPublicKey(pubkey);
  let addressHash = ThinNeo.Helper.GetPublicKeyScriptHash_FromAddress(address);
  // 封装交易
  let tran = new ThinNeo.Transaction();
  tran.type = ThinNeo.TransactionType.InvocationTransaction;
  tran.extdata = new ThinNeo.InvokeTransData();
  let sb = new ThinNeo.ScriptBuilder();
  let scriptaddress = scHash.hexToBytes().reverse();
  let randomNum = new Neo.BigInteger(Math.floor(Math.random() * 10000))
  sb.EmitPushNumber(randomNum);
  sb.Emit(ThinNeo.OpCode.DROP);
  sb.EmitParamJson(params);
  sb.EmitPushString(method);
  sb.EmitAppCall(scriptaddress);
  tran.extdata.script = sb.ToArray();
  tran.inputs = [];
  tran.outputs = [];
  tran.attributes = [];
  tran.attributes[0] = new ThinNeo.Attribute();
  tran.attributes[0].usage = ThinNeo.TransactionAttributeUsage.Script;
  tran.attributes[0].data = addressHash;
  let msg = tran.GetMessage();
  let signdata = ThinNeo.Helper.Sign(msg, prikey);
  tran.AddWitness(signdata, pubkey, address);
  let txid = "0x" + tran.GetHash().clone().reverse().toHexString();
  let rawData = tran.GetRawData().toHexString();
  return {
    txid,
    rawData
  };
};

// 调用合约底层方法
function callC2(wif, globalCoinParams, callParams) {
  let prikey = ThinNeo.Helper.GetPrivateKeyFromWIF(wif);
  let pubkey = ThinNeo.Helper.GetPublicKeyFromPrivateKey(prikey);
  let address = ThinNeo.Helper.GetAddressFromPublicKey(pubkey);
  let addressHash = ThinNeo.Helper.GetPublicKeyScriptHash_FromAddress(address);
  let toAddrHash = ThinNeo.Helper.GetPublicKeyScriptHash_FromAddress(globalCoinParams.toAddr);
  let assertId = globalCoinParams.assertId;
  if (assertId === "neo") {
    assertId = config.neoId;
  }
  if (assertId === "gas") {
    assertId = config.neoGasId;
  }
  let assertIdBytes = assertId.hexToBytes().reverse();
  let sendcount = Neo.Fixed8.parse(globalCoinParams.amount.toString());

  // 封装交易信息
  let tran = new ThinNeo.Transaction();
  tran.type = ThinNeo.TransactionType.ContractTransaction;
  tran.version = 0; //0 or 1
  tran.attributes = [];

  // 封装utxo的input和output
  tran.inputs = [];
  tran.outputs = [];
  let utxos = [];
  globalCoinParams.utxos.forEach(item => {
    if (item.asset === assertId) utxos.push(item);
  });
  // 封装input
  let count = Neo.Fixed8.Zero;
  for (let i = 0; i < utxos.length; i++) {
    let item = utxos[i];
    let input = new ThinNeo.TransactionInput();
    input.hash = item.txid.hexToBytes().reverse();
    input.index = item.n;
    input["_addr"] = item.addr;
    tran.inputs.push(input);
    count = count.add(Neo.Fixed8.parse(item.value.toString()));
    if (count.compareTo(sendcount) > 0) break;
  }
  if (count.compareTo(sendcount) < 0) {
    console.log("utxo input error !!!");
    return false;
  }
  //输出
  let output = new ThinNeo.TransactionOutput();
  output.assetId = assertIdBytes;
  output.value = sendcount;
  output.toAddress = toAddrHash;
  tran.outputs.push(output);
  //找零
  let change = count.subtract(sendcount);
  if (change.compareTo(Neo.Fixed8.Zero) > 0) {
    let outputChange = new ThinNeo.TransactionOutput();
    outputChange.toAddress = addressHash;
    outputChange.value = change;
    outputChange.assetId = assertIdBytes;
    tran.outputs.push(outputChange);
  }

  // 封装调用合约参数
  if (callParams) {
    tran.type = ThinNeo.TransactionType.InvocationTransaction;
    tran.extdata = new ThinNeo.InvokeTransData();
    let sb = new ThinNeo.ScriptBuilder();
    let scHash = callParams.scHash.hexToBytes().reverse();
    sb.EmitParamJson(callParams.params);
    sb.EmitPushString(callParams.method);
    sb.EmitAppCall(scHash);
    (tran.extdata).script = sb.ToArray();
    (tran.extdata).gas = Neo.Fixed8.fromNumber(1.0);
  }
  let msg = tran.GetMessage();
  let signdata = ThinNeo.Helper.Sign(msg, prikey);
  tran.AddWitness(signdata, pubkey, address);
  let txid = "0x" + tran.GetHash().clone().reverse().toHexString();
  let rawData = tran.GetRawData().toHexString();
  return {
    txid,
    rawData
  };
};

// hex转字符串
function hex2String(hex) {
  return ThinNeo.Helper.Bytes2String(hex.toString().hexToBytes());
};

// hex转int
function hex2Integer(hex) {
  if (!hex) return 0;
  return +new Neo.BigInteger(hex.toString().hexToBytes());
};

// 大小端序转换
function endianChange(str) {
  if (!str.length) return;
  let result = [];
  if (str.indexOf("0x") === 0) {
    str = str.slice(2);
  } else {
    result.push("0x");
  }
  let smaArray = str.hexToBytes().reverse();
  for (let i = 0; i < smaArray.length; i++) {
    let item = smaArray[i];
    let _item = item.toString(16);
    let itemStr = item < 16 ? ("0" + _item) : _item;
    result.push(itemStr);
  }
  return result.join("");
}

// addr转hex
function addr2Hex(addr) {
  let _addrArr = ThinNeo.Helper.GetPublicKeyScriptHash_FromAddress(addr);
  return _addrArr.toHexString();
};

// 字符串转hex
function string2Hex(str) {
  if (str === "") return "";
  let hexChar = [];
  for (let i = 0; i < str.length; i++) {
    hexChar.push((str.charCodeAt(i)).toString(16));
  }
  return hexChar;
};

module.exports = {
  config,
  getInfoFromWIF,
  transferNep5,
  transferGlobalCoin,
  callC,
  callC2,
  hex2String,
  hex2Integer,
  endianChange,
  addr2Hex,
  string2Hex
}