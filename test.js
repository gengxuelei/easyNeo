const eNeo = require("./eNeo.js");
const key = require('./key.json');

// 配置环境对应的api，不同的api返回的result结构可能不一致
eNeo.config.apiUrl = key.privateApiUrl;

// 测试获取storage
async function testFetch() {
  console.log("testFetch##########");
  let scHash = key.scHash;
  let storageKey = eNeo.string2Hex("totalSupply").join("");
  let storageKey2 = "11" + eNeo.addr2Hex(key.addr1);
  let res = await eNeo.getRpc("getstorage", scHash, storageKey)
  console.log(eNeo.hex2Integer(res.data.result[0].storagevalue));
  let res2 = await eNeo.getRpc("getstorage", scHash, storageKey2)
  console.log(eNeo.hex2Integer(res2.data.result[0].storagevalue));
}

// 测试参数封装
async function testEmit() {
  let addr = key.addr1;
  let scHash = key.scHash;
  let params = [{
      param: ["(addr)" + addr],
      method: "balanceOf",
    },
    {
      method: "symbol"
    },
    {
      method: "decimals",
    }
  ]
  let sb = eNeo.emitParams(scHash, params);
  let sbHex = sb.ToArray().toHexString();
  let res = await eNeo.getRpc("invokescript", sbHex);
  console.log("testEmit##########");
  console.log(res.data.result[0].stack);
}

// 测试nep5资产的转账
async function testTransferNep5() {
  let scHash = key.scHash;
  let wif = key.wif1;
  let toAddr = key.addr2;
  let amount = 300000000;
  let rawObj = eNeo.transferNep5(wif, scHash, toAddr, amount);
  // console.log(rawObj);
  let res = await eNeo.getRpc("sendrawtransaction", rawObj.rawData);
  console.log("testTransferNep5##########");
  console.log(res.data);
}

// neo和gas的转账要等前一笔成功才能执行第二笔（或者手动拼装utxo）
// 所以transferNeo和transferNep5WithNeo不能同时执行
async function transferNeo() {
  let wif = key.wif1;
  let toAddrArr = [{
    toAddr: key.addr2,
    amount: 2
  }, {
    toAddr: key.addr3,
    amount: 3
  }];
  let _utxos = await eNeo.getRpc("getutxo", key.addr1);
  let utxos = _utxos["data"]["result"];
  let rawObj = eNeo.transferGlobalCoin(wif, utxos, "neo", toAddrArr);
  // console.log(rawObj);
  let res = await eNeo.getRpc("sendrawtransaction", rawObj.rawData);
  console.log("transferNeo##########");
  console.log(res.data);
}

// neo和gas的转账要等前一笔成功才能执行第二笔（或者手动拼装utxo）
// 所以transferNeo和transferNep5WithNeo不能同时执行
async function transferNep5WithNeo() {
  let wif = key.wif1;
  let prikey = ThinNeo.Helper.GetPrivateKeyFromWIF(wif);
  let pubkey = ThinNeo.Helper.GetPublicKeyFromPrivateKey(prikey);
  let address = ThinNeo.Helper.GetAddressFromPublicKey(pubkey);

  let scHash = key.scHash;
  let toAddr = key.addr1;

  let _utxos = await eNeo.getRpc("getutxo", key.addr1);
  let utxos = _utxos["data"]["result"];

  let toAddrArr = [{
    toAddr: key.addr2,
    amount: 2
  }, {
    toAddr: key.addr3,
    amount: 3
  }];

  let globalCoinParams = {
    assertId: "neo",
    toAddrArr,
    utxos
  };

  let callParams = {
    scHash,
    method: "transfer",
    params: [
      "(addr)" + address,
      "(addr)" + toAddr,
      "(int)" + 300000000
    ]
  };
  let rawObj = eNeo.callC2(wif, globalCoinParams, callParams);
  // console.log(rawObj);
  let res = await eNeo.getRpc("sendrawtransaction", rawObj.rawData);
  console.log("transferNep5WithNeo##########");
  console.log(res.data);
}

function init() {
  // testFetch();
  // testEmit();
  // testTransferNep5();
  // neo和gas的转账要等前一笔成功才能执行第二笔（或者手动拼装utxo）
  // 所以transferNeo和transferNep5WithNeo不能同时执行
  transferNeo();
  // transferNep5WithNeo();
}

init();