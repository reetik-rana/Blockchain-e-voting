// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestSimple {
    address public owner;
    uint public count;
    
    constructor() {
        owner = msg.sender;
    }
    
    function increment() public {
        require(msg.sender == owner, "only owner");
        count++;
    }
}
