"use strict";

window.eNeo = {};

eNeo.version = "1.1.0";

// 配置
eNeo.config = {
  neoId: "0xc56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b",
  neoGasId: "0x602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7"
};

// 从wif获取私钥公钥地址等相关信息
eNeo.getInfoFromWIF = function (wif) {
  var prikey = ThinNeo.Helper.GetPrivateKeyFromWIF(wif);
  var pubkey = ThinNeo.Helper.GetPublicKeyFromPrivateKey(prikey);
  var address = ThinNeo.Helper.GetAddressFromPublicKey(pubkey);
  return {
    wif: wif,
    prikey: prikey,
    pubkey: pubkey,
    address: address
  };
};

// 只转Nep5资产快捷方法
eNeo.transferNep5 = function (wif, assertId, toAddr, amount) {
  var address = getInfoFromWIF(wif)["address"];
  var method = "transfer";
  var params = ["(address)" + address, "(address)" + toAddr, "(integer)" + amount];
  return callC(wif, assertId, method, params);
};

// 只转全局资产快捷方法
eNeo.transferGlobalCoin = function (wif, utxos, assertId, toAddr, amount) {
  if (assertId === "neo") {
    assertId = eNeo.config.neoId;
  }
  if (assertId === "gas") {
    assertId = eNeo.config.neoGasId;
  }
  var globalCoinParams = {
    assertId: assertId,
    amount: amount,
    toAddr: toAddr,
    utxos: utxos
  };
  return callC2(wif, globalCoinParams);
};

// 直接调用合约（与utxo无关）
eNeo.callC = function (wif, scHash, method, params) {
  var prikey = ThinNeo.Helper.GetPrivateKeyFromWIF(wif);
  var pubkey = ThinNeo.Helper.GetPublicKeyFromPrivateKey(prikey);
  var address = ThinNeo.Helper.GetAddressFromPublicKey(pubkey);
  var addressHash = ThinNeo.Helper.GetPublicKeyScriptHash_FromAddress(address);
  // 封装交易
  var tran = new ThinNeo.Transaction();
  tran.type = ThinNeo.TransactionType.InvocationTransaction;
  tran.extdata = new ThinNeo.InvokeTransData();
  var sb = new ThinNeo.ScriptBuilder();
  var scriptaddress = scHash.hexToBytes().reverse();
  var randomNum = new Neo.BigInteger(Math.floor(Math.random() * 10000));
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
  var msg = tran.GetMessage();
  var signdata = ThinNeo.Helper.Sign(msg, prikey);
  tran.AddWitness(signdata, pubkey, address);
  var txid = "0x" + tran.GetHash().clone().reverse().toHexString();
  var rawData = tran.GetRawData().toHexString();
  return {
    txid: txid,
    rawData: rawData
  };
};

// 调用合约底层方法
eNeo.callC2 = function (wif, globalCoinParams, callParams) {
  var prikey = ThinNeo.Helper.GetPrivateKeyFromWIF(wif);
  var pubkey = ThinNeo.Helper.GetPublicKeyFromPrivateKey(prikey);
  var address = ThinNeo.Helper.GetAddressFromPublicKey(pubkey);
  var addressHash = ThinNeo.Helper.GetPublicKeyScriptHash_FromAddress(address);
  var toAddrHash = ThinNeo.Helper.GetPublicKeyScriptHash_FromAddress(globalCoinParams.toAddr);
  var assertId = globalCoinParams.assertId;
  if (assertId === "neo") {
    assertId = eNeo.config.neoId;
  }
  if (assertId === "gas") {
    assertId = eNeo.config.neoGasId;
  }
  var assertIdBytes = assertId.hexToBytes().reverse();
  var sendcount = Neo.Fixed8.parse(globalCoinParams.amount.toString());

  // 封装交易信息
  var tran = new ThinNeo.Transaction();
  tran.type = ThinNeo.TransactionType.ContractTransaction;
  tran.version = 0; //0 or 1
  tran.attributes = [];

  // 封装utxo的input和output
  tran.inputs = [];
  tran.outputs = [];
  var utxos = [];
  globalCoinParams.utxos.forEach(function (item) {
    if (item.asset === assertId) utxos.push(item);
  });
  // 封装input
  var count = Neo.Fixed8.Zero;
  for (var i = 0; i < utxos.length; i++) {
    var item = utxos[i];
    var input = new ThinNeo.TransactionInput();
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
  var output = new ThinNeo.TransactionOutput();
  output.assetId = assertIdBytes;
  output.value = sendcount;
  output.toAddress = toAddrHash;
  tran.outputs.push(output);
  //找零
  var change = count.subtract(sendcount);
  if (change.compareTo(Neo.Fixed8.Zero) > 0) {
    var outputChange = new ThinNeo.TransactionOutput();
    outputChange.toAddress = addressHash;
    outputChange.value = change;
    outputChange.assetId = assertIdBytes;
    tran.outputs.push(outputChange);
  }

  // 封装调用合约参数
  if (callParams) {
    tran.type = ThinNeo.TransactionType.InvocationTransaction;
    tran.extdata = new ThinNeo.InvokeTransData();
    var sb = new ThinNeo.ScriptBuilder();
    var scHash = callParams.scHash.hexToBytes().reverse();
    sb.EmitParamJson(callParams.params);
    sb.EmitPushString(callParams.method);
    sb.EmitAppCall(scHash);
    tran.extdata.script = sb.ToArray();
    tran.extdata.gas = Neo.Fixed8.fromNumber(1.0);
  }
  var msg = tran.GetMessage();
  var signdata = ThinNeo.Helper.Sign(msg, prikey);
  tran.AddWitness(signdata, pubkey, address);
  var txid = "0x" + tran.GetHash().clone().reverse().toHexString();
  var rawData = tran.GetRawData().toHexString();
  return {
    txid: txid,
    rawData: rawData
  };
};

// hex转字符串
eNeo.hex2String = function (hex) {
  return ThinNeo.Helper.Bytes2String(hex.toString().hexToBytes());
};

// hex转int
eNeo.hex2Integer = function (hex) {
  if (!hex) return 0;
  return +new Neo.BigInteger(hex.toString().hexToBytes());
};

// 大小端序转换
eNeo.endianChange = function (str) {
  if (!str.length) return;
  var result = [];
  if (str.indexOf("0x") === 0) {
    str = str.slice(2);
  } else {
    result.push("0x");
  }
  var smaArray = str.hexToBytes().reverse();
  for (var i = 0; i < smaArray.length; i++) {
    var item = smaArray[i];
    var _item = item.toString(16);
    var itemStr = item < 16 ? "0" + _item : _item;
    result.push(itemStr);
  }
  return result.join("");
};

// addr转hex
eNeo.addr2Hex = function (addr) {
  var _addrArr = ThinNeo.Helper.GetPublicKeyScriptHash_FromAddress(addr);
  return _addrArr.toHexString();
};

// 字符串转hex
eNeo.string2Hex = function (str) {
  if (str === "") return "";
  var hexChar = [];
  for (var i = 0; i < str.length; i++) {
    hexChar.push(str.charCodeAt(i).toString(16));
  }
  return hexChar;
};

// rpc调用
eNeo.getRpc = function (method) {
  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  var urlStr = eNeo.config.apiUrl + "?jsonrpc=2.0&id=1&method=" + method + "&params=" + JSON.stringify(args);
  return axios.get(urlStr);
};

// rpc调用
eNeo.postRpc = function (method) {
  for (var _len2 = arguments.length, args = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    args[_key2 - 1] = arguments[_key2];
  }

  var params = {
    "jsonrpc": "2.0",
    "method": method,
    "id": "1",
    "params": args
  };
  return axios.post(eNeo.config.apiUrl, params);
};

// 处理参数，返回sb-ScriptBuilder
eNeo.emitParams = function (scHash, params) {
  var sb = new ThinNeo.ScriptBuilder();
  var scBytes = scHash.hexToBytes().reverse();
  params.forEach(function (item) {
    var param = item.param ? item.param : [];
    sb.EmitParamJson(param); //Parameter list
    sb.EmitPushString(item.method); //Method
    sb.EmitAppCall(scBytes); //nep5脚本
  });
  return sb;
};