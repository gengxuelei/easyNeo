## easyNeo-NEO前端dapp敏捷开发套件

本NPM包旨在简化调用者和NEO区块链交互的操作，简介如下：
- **项目地址**： https://github.com/gengxuelei/easyNeo
- **项目初衷**：简化js调用NEO智能合约的操作
- **项目参考**：奔奔例子三连

------

### 项目介绍：
#### easyNeo
1. 封装了wif和公钥等的转换
2. 封装了转移Nep5资产的快捷调用
3. 封装了转移全局资产NEO和GAS的快捷调用
4. 直接调用合约（与UTXO无关）
5. 调用合约底层封装（包含了封装交易、UTXO、合约调用等）
6. hex和字符串、int等之间的转换
7. 大小端序转换
8. addr和hex的快捷转换

#### eNeo
eNeo在easyNeo的基础上加了axios的http调用，easyNeo只是做本地算法处理，返回RAW数据，eNeo封装了getRpc和postRpc，通过配置rpcUrl参数，可以快捷查询区块链和广播交易。

### todo：
1. 加入签名、验签的功能
2. 加入原始参数和字节码之间的转换
3. 加入多签功能
4. 完善测试样例

### 安装指引：

**项目依赖**
1. 如果只是使用原始数据处理（交易封装，数据格式处理），引用nel-neo-thinsdk的npm库即可
2. 如果需要查询区块数据和广播交易，需要配置rpcUrl参数，引入axios依赖，使用eNeo

**npm安装**
如果是node项目，直接使用npm或者yarn安装即可：
```js
npm install -S easyNeo
```
如果需要使用http，请手动拷贝项目目录里的eNeo文件

**浏览器直接使用**
如果是浏览器项目，可以使用dist目录里的编译后版本，直接饮用即可，全局暴露了eNeo变量
```
<script src="./dist/eNeo.es5.js></script>
```

### SHOW U THE CODE:

#### getInfoFromWIF
此函数接受WIF，返回一个包含私钥、公钥、地址的对象，数据关系（wif和私钥打死不能告诉别人哦）：
```markdown
WIF <==> priKey ==> pubKey <==> address
```
ThinNeo封装了一些私钥公钥和地址等之间的转换关系，但是之间传递使用的是Uint数组，需要自己转换格式。

#### transferNep5
```js
/**
 * 只转Nep5资产快捷方法
 * @param wif 转账人私钥
 * @param assertId nep5资产ID
 * @param toAddr 目标地址
 * @param amount 转账数额（整型，需乘以精度）
 * @return 返回交易序号txid和可以广播的签名交易数据
 */

```
#### transferGlobalCoin
```js
/**
 * 只转全局资产快捷方法
 * @param wif 转账人的WIF
 * @param utxos 通过rpc读取转账人的UTXO数据作为参数传入
 * @param assertId “neo”或者“gas”
 * @param toAddrArr 目标地址
 * @return 返回交易序号txid和可以广播的签名交易数据
 */
```
#### callC
```js
/**
 * 直接调用合约（与utxo无关）
 * @param wif 签名人的WIF
 * @param scHash 合约hash
 * @param method 调用合约函数名
 * @param params 合约函数参数
 * @return 返回交易序号txid和可以广播的签名交易数据
 */
```
L53创建一个交易对象，然后设置交易对象类型；
L59到L63是把各个参数转变成16进制，emitPushNumber和emitPushString等的底层是在调用EmitPushBytes；
L72是使用私钥对交易进行签名；
L73是添加见证人；
L74是获取交易ID（这说明在未广播之前就已经知道了交易序号）；
L75是获取签名后的交易数据的字节码，用以广播交易。


#### callC2
```js
/**
 * 调用合约底层方法
 * @param wif 签名人的WIF
 * @param globalCoinParams 全局资产参数
 * @param callParams 调用合约参数
 * @return 返回交易序号txid和可以广播的签名交易数据
 */
```
L88到L96是在处理转出账户（也就是说可以转出全局资产给多人）（如张三转给李思3块钱同时转给王五9块钱）；
L98到L104是在处理转出资产是neo还是gas（这里应该支持大小写）；
L121开始是在封装input，也就是说从UTXO（如果你还不熟悉UTXO，可以先去补补），可以理解成从存钱罐里找出足够支付的钱（比如你找到了5块钱的纸币+10块钱的纸币）；
L37开始封装output，也就是分账，把给李思和王五的钱的帐先明明白白记好；
L146开始计算找零，你准备了15块钱做支付，而只需要付12块钱，是不是得找给自己3块钱（明明白白一笔帐）；
L155开始和callC一个逻辑，就是封装调用合约的参数，也就是说你在转账全局资产的同时还能执行一个合约操作，具体的例子可以看看CNEO（一种nep5资产，用来映射NEO）合约的实现。


-------
您的支持将鼓励我继续创作！

![Buy me a coffee](http://qiniu.sues.top/blog/imgs/pay/wechatpay.jpg)
