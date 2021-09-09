# Demo SharedWallet
SmartContract ví tiền chia sẻ, cho chuyển tiền vào ví, qui định hạn mức cho từng người, rút tiền theo hạn mức

### Start private note local
```
geth --datadir chaindata --ws --ws.port 3334 --ws.api eth,net,web3,personal --http --http.port 3334 --http.api personal,eth,net,web3  --rpc --rpcapi eth,net,web3,personal --rpccorsdomain "https://remix.ethereum.org" --allow-insecure-unlock --miner.gaslimit '9000000000000' --rpc.allow-unprotected-txs
```

### Run web3 demo
```
npm install
node ./ContractInteractor.js
```

### Run Gnosis Safe demo
```
npm install
node ./GnosisSafeInteractor.js
```