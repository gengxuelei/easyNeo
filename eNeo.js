const easyNeo = require("./index.js");
const axios = require("axios");

const config = easyNeo.config;

// rpc调用
function getRpc(method, ...args) {
  const urlStr = config.apiUrl + "?jsonrpc=2.0&id=1&method=" + method + "&params=" + JSON.stringify(args);
  return axios.get(urlStr)
};

// rpc调用
function postRpc(method, ...args) {
  let params = {
    "jsonrpc": "2.0",
    "method": method,
    "id": "1",
    "params": args
  }
  return axios.post(config.apiUrl, params)
};

// 处理参数，返回sb-ScriptBuilder
function emitParams(scHash, params) {
  let sb = new ThinNeo.ScriptBuilder();
  let scBytes = scHash.hexToBytes().reverse();
  params.forEach(item => {
    let param = item.param ? item.param : [];
    sb.EmitParamJson(param); //Parameter list
    sb.EmitPushString(item.method); //Method
    sb.EmitAppCall(scBytes); //nep5脚本
  });
  return sb;
}

module.exports = {
  getRpc,
  postRpc,
  emitParams,
  config,
  getInfoFromWIF: easyNeo.getInfoFromWIF,
  transferNep5: easyNeo.transferNep5,
  transferGlobalCoin: easyNeo.transferGlobalCoin,
  callC: easyNeo.callC,
  callC2: easyNeo.callC2,
  hex2String: easyNeo.hex2String,
  hex2Integer: easyNeo.hex2Integer,
  endianChange: easyNeo.endianChange,
  addr2Hex: easyNeo.addr2Hex,
  string2Hex: easyNeo.string2Hex,
}