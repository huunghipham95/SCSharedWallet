let Web3 = require('web3')
let provider = new Web3.providers.WebsocketProvider('ws://localhost:3334')

let web3 = new Web3(provider)

const CONTRACT_ADDRESS = '0x18048f93aF3eE6a18662f6a4f01Cc4b48205e7C6'
const OWNER_ADDRESS = '0xa4805ba02905053fe0d7ec4aa2fe4ad95cb8a5ed'
const ALLOW1 = '0xa3d5a214fabab0c62c8430fbf2fd290cdec73632'
const ALLOW2 = '0xa7bb30a2e8a5ea8b99bd255df33c2f15a39657b1'

web3.eth.Contract.set
let swContract = new web3.eth.Contract(require('./SharedWallet.abi.json'), CONTRACT_ADDRESS)

async function getBalance(address) {
    try{
        let balance = await web3.eth.getBalance(address)
        let balanceInEther = web3.utils.fromWei(balance, 'ether')
        console.log(`${address}: ${balanceInEther} ether`)
    } catch(exeption) {
        console.log(exeption)
    }
}

async function sendTransaction(from, to, amountInEther, callback) {
    web3.eth.sendTransaction({from, to, value:web3.utils.toWei(amountInEther.toString(), 'ether')}, callback)
}

function withdrawMoney(address, amountInEther, callback) {
    swContract.methods.withdrawMoney(address, web3.utils.toWei(amountInEther.toString(), 'ether'))
        .send({from: address}, callback)
}

swContract.events.AllowanceChange({},(error, event) => {
    console.log(error)
    console.log(event)
})
    .on('data', (e) => {
        console.log(e)
    })

sendTransaction(
    OWNER_ADDRESS, CONTRACT_ADDRESS, 10, 
    () => sendTransaction(
        ALLOW1, CONTRACT_ADDRESS, 10, 
        () => sendTransaction(
            ALLOW2, CONTRACT_ADDRESS, 10,
            setAllowanceThenWithdraw 
        )
    )
)

function setAllowanceThenWithdraw() {
    swContract.methods.setAllowance(ALLOW1, web3.utils.toWei('20', 'ether'))
    .send({from: OWNER_ADDRESS}, (error, result) => {
        console.log(error)
        if (result) {
            console.log(result)
            withdrawMoney(
                ALLOW1, 10,
                (error, result) => {
                    console.log(error)
                    getBalance(ALLOW1)
                }
            )
        }
    })

    swContract.methods.setAllowance(ALLOW2, web3.utils.toWei('20', 'ether'))
        .send({from: OWNER_ADDRESS}, (error, result) => {
            console.log(error)
            if (result) {
                console.log(result)
                withdrawMoney(
                    ALLOW2, 10,
                    (error, result) => {
                        console.log(error)
                        getBalance(ALLOW2)
                    }
                )
            }
        })
}
