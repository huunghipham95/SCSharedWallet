# Demo SharedWallet
SmartContract ví tiền chia sẻ, cho chuyển tiền vào ví, qui định hạn mức cho từng người, rút tiền theo hạn mức

### Start private note local
```geth --datadir chaindata --ws --ws.port 3334 --ws.api eth,net,web3 --http --http.port 3334 --http.api personal,eth,net,web3  --rpc --rpccorsdomain "https://remix.ethereum.org" --allow-insecure-unlock```