pragma solidity ^0.8.0;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/math/SafeMath.sol";

contract Owned {
    
    event OwnershipCreated(address _address);
    
    address public ownerAdd;
    
    constructor() {
        ownerAdd = msg.sender;
        emit OwnershipCreated(ownerAdd);
    }
    
    modifier ownerOnly() {
        require(ownerAdd == msg.sender, "Only owner can do this!");
        _;
    }
    
}

contract Allowance is Owned {
    
    using SafeMath for uint;
    
    event AllowanceChange(address _to, address _from, uint _amount, uint _amountBefore);
    
    mapping(address => uint) public allowance;
    
    modifier ownerOrAllowed(uint amount) {
        require((ownerAdd == msg.sender) || (allowance[msg.sender] >= amount), "You are not allowed to do this");
        _;
    }
    
    function setAllowance(address _address, uint amount) public ownerOnly {
        allowance[_address] = amount;
    }
    
    function reduceAllowance(address payable _to, uint amount) internal {
        emit AllowanceChange(_to, msg.sender, amount, allowance[msg.sender]);
        allowance[msg.sender] = allowance[msg.sender].sub(amount);
    }
}

contract SharedWallet is Allowance {
    
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }
    
    
    function withdrawMoney(address payable _to, uint amount) public ownerOrAllowed(amount) {
        reduceAllowance(_to, amount);
        _to.transfer(amount);
    }
    
    function destroy() public ownerOnly {
        selfdestruct(payable(ownerAdd));
    }
    
    receive() external payable {
        
    }
}