let Web3 = require('web3')
let provider = new Web3.providers.WebsocketProvider('ws://localhost:3334')

let web3 = new Web3(provider)

const CALL = 0
const CONTRACT_ADDRESS = '0x1E4D13dd62D55F57FeC67A3E2CE6DA1F62E5a3A3'

const Address0 = "0x".padEnd(42, '0')
const GAS_PRICE = web3.utils.toWei("100", 'gwei')

const KEYSTORES = [
    {"address":"a4805ba02905053fe0d7ec4aa2fe4ad95cb8a5ed","crypto":{"cipher":"aes-128-ctr","ciphertext":"bcde7eeb8da0b76f5873aec7a9ed4a8b0e2d75d45137401dcba839e73a7d806d","cipherparams":{"iv":"045c066fc4f44c4aa36692c096abb387"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"2f8cb44eff4a41254d1a358e0d11ec182ca04097af79d268062c6b11b00d218c"},"mac":"ce94d274fe0ce5abe2105e5a325ff5543e459157a2b3a018717d9142a3624dd3"},"id":"c7fe4adf-e149-4455-a5d0-dac75acf7a48","version":3},
    {"address":"a3d5a214fabab0c62c8430fbf2fd290cdec73632","crypto":{"cipher":"aes-128-ctr","ciphertext":"66505f7ef337b1cf063e0a36b07737f2fb94ee9dae46ee46599aada9d6d04acb","cipherparams":{"iv":"3214993feeac1dfbbb964bed70eb88f8"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"5ae2a685badd0a1c5a9eab158a6800989116dbdfc83d89eabb204889d1a85c0d"},"mac":"6a170152e23ff9b453c2fd86e07f1761fce066d8bf68b9615e912bf6e0b7a596"},"id":"c6bae3ae-d667-4ab0-b98c-b34bc4f80ace","version":3},
    {"address":"a7bb30a2e8a5ea8b99bd255df33c2f15a39657b1","crypto":{"cipher":"aes-128-ctr","ciphertext":"6cd78ea81f49e79f8c9271def4582c7a81d70849ad51d5e2d514afa2db3a71eb","cipherparams":{"iv":"628958951050178c881e985f3e3731ff"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"5aa75f5db74f225407373b641a8ef925c7f3fbd8d0c0806d6faa2ac0812ce33f"},"mac":"643f5600c5763f13850b1eb572c1680750f8efeb99c0284459c2eef5f28c7203"},"id":"b1125007-117c-44a5-a2c2-e01c96313dc2","version":3},
    {"address":"c407643972610d850f1c4973d285a07af0f90663","crypto":{"cipher":"aes-128-ctr","ciphertext":"1442c1c72725fed22d26022591964c7b5c7885c93a2f2499816b522fab950e4c","cipherparams":{"iv":"410cb738d919422c64b42f2cdbc75706"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"94b58460aca416a563571404d704e5e4e908cf10adf03069c112001e78946014"},"mac":"8cf18d0cc7497177df5abda9ec004ee39c3d5b1ad43c1df613744a25f45ee218"},"id":"e07ea6e0-da9e-4929-9fa6-f9ea7f3d84d9","version":3}
]

let accounts = KEYSTORES.map(ks => web3.eth.accounts.decrypt(ks, 'asdf'))
let gContract = new web3.eth.Contract(require('./GnosisSafe.abi.json'), CONTRACT_ADDRESS)

let byteGasCosts = function(hexValue) {
    switch(hexValue) {
        case "0x": return 0
        case "00": return 4
        default: return 68
    }
}

let calcDataGasCosts = function(dataString) {
    const reducer = (accumulator, currentValue) => accumulator += byteGasCosts(currentValue)
    return dataString.match(/.{2}/g).reduce(reducer, 0)
}

let estimateBaseGas = function(to, value, data, operation, txGasEstimate, gasToken, refundReceiver, signatureCount, nonce) {
    let signatureCost = signatureCount * (68 + 2176 + 2176 + 6000) // (array count (3 -> r, s, v) + ecrecover costs) * signature count
    let payload = gContract.methods.execTransaction(
        to, value, data, operation, txGasEstimate, Address0, GAS_PRICE, gasToken, refundReceiver, "0x"
    ).encodeABI()
    let baseGasEstimate = calcDataGasCosts(payload) + signatureCost + (nonce > 0 ? 5000 : 20000)
    baseGasEstimate += 1500 // 1500 -> hash generation costs
    baseGasEstimate += 1000 // 1000 -> Event emission
    return baseGasEstimate + 32000; // Add aditional gas costs (e.g. base tx costs, transfer costs)
}

let executeTransactionWithSigner = async function(signer, subject, accounts, to, value, data, operation, executor, opts) {
    let options = opts || {}
    let txFailed = options.fails || false
    let txGasToken = options.gasToken || Address0
    let refundReceiver = options.refundReceiver || Address0
    let extraGas = options.extraGas || 0
    let executorValue = options.value || 0

    // Estimate safe transaction (need to be called with from set to the safe address)
    let txGasEstimate = 0
    let estimateData = gContract.methods.requiredTxGas(to, value, data, operation).encodeABI()
    try {
        let estimateResponse = await web3.eth.call({
            to: CONTRACT_ADDRESS, 
            from: CONTRACT_ADDRESS, 
            data: estimateData,
            gasPrice: 0
        })
        txGasEstimate = new BigNumber(estimateResponse.substring(138), 16)
        // Add 10k else we will fail in case of nested calls
        txGasEstimate = txGasEstimate.toNumber() + 10000
        console.log("    Tx Gas estimate: " + txGasEstimate)
    } catch(e) {
        console.log("    Could not estimate " + subject + "; cause: " + e)
    }
    let nonce = await gContract.methods.nonce().call()
    console.log('    nonce: ', nonce)

    let baseGasEstimate = estimateBaseGas(to, value, data, operation, txGasEstimate, txGasToken, refundReceiver, accounts.length, nonce) + extraGas
    console.log("    Base Gas estimate: " + baseGasEstimate)
    console.log("    txGasEstimate: ", txGasEstimate)
    if (txGasEstimate > 0) {
        let estimateDataGasCosts = calcDataGasCosts(estimateData)
        let additionalGas = 10000
        // To check if the transaction is successfull with the given safeTxGas we try to set a gasLimit so that only safeTxGas is available,
        // when `execute` is triggered in `requiredTxGas`. If the response is `0x` then the inner transaction reverted and we need to increase the amount.
        for (let i = 0; i < 100; i++) {
            try {
                console.log(i)
                let estimateResponse = await web3.eth.call({
                    to: CONTRACT_ADDRESS, 
                    from: CONTRACT_ADDRESS, 
                    data: estimateData, 
                    gasPrice: 0, 
                    gasLimit: txGasEstimate + estimateDataGasCosts + 21000 // We add 21k for base tx costs
                })
                console.log(i)
                if (estimateResponse != "0x") break
            } catch(e) {
                console.log("    Could simulate " + subject + "; cause: " + e)
            }
            txGasEstimate += additionalGas
            additionalGas *= 2
        }    
    }
    let gasPrice = GAS_PRICE
    if (txGasToken != Address0) {
        gasPrice = 1
    }
    gasPrice = options.gasPrice || gasPrice
    let sigs = await signer(to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, nonce)
    console.log('sigssss', sigs)
    let payload = gContract.methods.execTransaction(
        to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, sigs
    ).encodeABI()

    console.log("    Data costs: " + calcDataGasCosts(payload))
    console.log("    Tx Gas estimate: " + txGasEstimate)
    // Estimate gas of paying transaction
    let estimate = null
    try {
        estimate = await gContract.methods.execTransaction(to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, sigs)
            .estimateGas({
                from: executor.address,
                value: executorValue,
                gasPrice: options.txGasPrice || gasPrice
            })
    } catch (e) {
        console.log("    Estimation error")
        console.log(e)
    }

    if (estimate < txGasEstimate) {
        const block = await web3.eth.getBlock("latest")
        estimate = block.gasLimit - 10000
    }

    // Execute paying transaction
    // We add the txGasEstimate and an additional 10k to the estimate to ensure that there is enough gas for the safe transaction
    let tx = await gContract.methods.execTransaction(
        to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, sigs
    ).send(
        {
            from: executor.address,
            value: executorValue
        }
    )
    
    return tx
}

function signTransaction(signerArray, transactionHash) {
    let signatureBytes = "0x"
    console.log(signerArray)
    for (var i=0; i<signerArray.length; i++) {
        let sig = signerArray[i].sign(transactionHash)
        signatureBytes += sig.r.toString('hex').substring(2) + sig.s.toString('hex').substring(2) + sig.v.toString(16).substring(2)
    }
    console.log('signatureBytes: ', signatureBytes)
    console.log('signatureBytes: ', signatureBytes.length)
    return signatureBytes
}

let executeTransaction = async function(subject, sgs, to, value, data, operation, executor, opts) {
    let signer = async function(to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, nonce) {
        let transactionHash = await gContract.methods.getTransactionHash(to, value, data, operation, txGasEstimate, baseGasEstimate, gasPrice, txGasToken, refundReceiver, nonce).call()
        // Confirm transaction with signed messages
        return signTransaction(sgs, transactionHash)
    }
    return executeTransactionWithSigner(signer, subject, sgs, to, value, data, operation, executor, opts)
}

async function getBalance(address) {
    try{
        let balance = await web3.eth.getBalance(address)
        let balanceInEther = web3.utils.fromWei(balance, 'ether')
        console.log(`${address}: ${balanceInEther} ether`)
    } catch(exeption) {
        console.log(exeption)
    }
}

async function main() {
    await gContract.methods.setup(accounts.map(account=>account.address), 2, Address0, '0x', Address0, Address0, 0, Address0).send(
            {from: accounts[0].address},(error, result) => {
            console.log(error)
            console.log(result)
        })
    await web3.eth.sendTransaction({from: accounts[0].address, to: CONTRACT_ADDRESS, value: web3.utils.toWei("10", 'ether')})
    await gContract.methods.getOwners().call((err, result) => {
        console.log(err)
        console.log(result)
    })

    await getBalance(accounts[0])
    await executeTransaction('executeTransaction withdraw 0.5 ETH', [accounts[1], accounts[0]], accounts[0].address, web3.utils.toWei("0.5", 'ether'), "0x", CALL, accounts[0], {
        gasToken: accounts[0].address,
        refundReceiver: accounts[0].address
    })
    await getBalance(accounts[0])
}

main()