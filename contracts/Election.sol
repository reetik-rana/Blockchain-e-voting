// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Election is Pausable, ReentrancyGuard {
    address public owner;

    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }

    uint public candidatesCount;
    mapping(uint => Candidate) public candidates;

    mapping(address => bool) public registered;
    mapping(address => bool) public hasVoted;
    mapping(address => uint) public votes; // candidateId
    mapping(address => bytes32) public voteHashes; // hash of encrypted vote stored on IPFS

    // Voting period
    uint public votingStart;
    uint public votingEnd;
    bool public votingPeriodSet;

    event VoterRegistered(address indexed voter);
    event CandidateAdded(uint indexed id, string name);
    event VoteCast(address indexed voter, uint indexed candidateId, bytes32 voteHash);
    event VotingPeriodSet(uint startTime, uint endTime);
    event EmergencyPaused(address indexed by);
    event EmergencyUnpaused(address indexed by);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyRegistered() {
        require(registered[msg.sender], "not registered");
        _;
    }

    modifier duringVotingPeriod() {
        require(votingPeriodSet, "voting period not set");
        require(block.timestamp >= votingStart, "voting not started");
        require(block.timestamp <= votingEnd, "voting ended");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Set voting period (can only be set once or by owner before voting starts)
    function setVotingPeriod(uint _start, uint _end) public onlyOwner {
        require(_start < _end, "invalid period");
        require(_start >= block.timestamp, "start must be in future");
        require(!votingPeriodSet || block.timestamp < votingStart, "cannot change during/after voting");
        
        votingStart = _start;
        votingEnd = _end;
        votingPeriodSet = true;
        
        emit VotingPeriodSet(_start, _end);
    }

    function addCandidate(string memory name) public onlyOwner whenNotPaused {
        require(bytes(name).length > 0, "name cannot be empty");
        require(bytes(name).length <= 100, "name too long");
        // Prevent addresses from being used as candidate names
        require(bytes(name).length < 42 || bytes(name)[0] != '0' || bytes(name)[1] != 'x', "invalid name format");
        require(!votingPeriodSet || block.timestamp < votingStart, "cannot add candidates during/after voting");
        
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, name, 0);
        emit CandidateAdded(candidatesCount, name);
    }

    function registerVoter(address _voter) public onlyOwner whenNotPaused {
        require(_voter != address(0), "invalid address");
        require(_voter != owner, "owner cannot vote");
        require(!registered[_voter], "already registered");
        
        registered[_voter] = true;
        emit VoterRegistered(_voter);
    }

    // Emergency pause/unpause
    function pause() public onlyOwner {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    function unpause() public onlyOwner {
        _unpause();
        emit EmergencyUnpaused(msg.sender);
    }

    // candidateId must be valid and voter must be registered
    // voteHash should be the SHA-256 (or keccak) hash of the encrypted vote stored off-chain (IPFS)
    function castVote(uint candidateId, bytes32 voteHash) public onlyRegistered duringVotingPeriod whenNotPaused nonReentrant {
        require(candidateId > 0 && candidateId <= candidatesCount, "invalid candidate");
        require(voteHash != bytes32(0), "invalid vote hash");

        if (hasVoted[msg.sender]) {
            uint prev = votes[msg.sender];
            if (prev != candidateId) {
                // revoke previous vote and count new
                candidates[prev].voteCount -= 1;
                candidates[candidateId].voteCount += 1;
                votes[msg.sender] = candidateId;
                voteHashes[msg.sender] = voteHash;
                emit VoteCast(msg.sender, candidateId, voteHash);
            } else {
                // same candidate: allow updating the hash (e.g., re-upload to IPFS)
                voteHashes[msg.sender] = voteHash;
                emit VoteCast(msg.sender, candidateId, voteHash);
            }
        } else {
            hasVoted[msg.sender] = true;
            votes[msg.sender] = candidateId;
            voteHashes[msg.sender] = voteHash;
            candidates[candidateId].voteCount += 1;
            emit VoteCast(msg.sender, candidateId, voteHash);
        }
    }

    function getCandidate(uint id) public view returns (uint, string memory, uint) {
        Candidate storage c = candidates[id];
        return (c.id, c.name, c.voteCount);
    }

    // returns arrays of candidate ids and counts
    function tally() public view returns (uint[] memory ids, uint[] memory counts) {
        ids = new uint[](candidatesCount);
        counts = new uint[](candidatesCount);
        for (uint i = 0; i < candidatesCount; i++) {
            ids[i] = i + 1;
            counts[i] = candidates[i + 1].voteCount;
        }
        return (ids, counts);
    }
}
