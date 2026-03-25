// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title OpenInnovate DAO LLC — Governance Contract
/// @notice On-chain governance provenance for Wyoming DAO LLC (W.S. 17-31-104)
/// @dev UUPS upgradeable proxy. Owner = sole member (human executor).
///      Algorithmic manager = Claude (Anthropic API), operating off-chain.
///      This contract records decision hashes, not decision logic.
contract OpenInnovateGovernance is Initializable, UUPSUpgradeable, OwnableUpgradeable {

    // --- State ---

    uint256 public version;
    uint256 public lastActivityTimestamp;
    uint256 public proposalCount;
    uint256 public decisionCount;

    struct Proposal {
        bytes32 contentHash;
        string uri;
        address submittedBy;
        uint256 timestamp;
    }

    struct Decision {
        uint256 proposalId;
        bytes32 reasoningTreeHash;
        uint8 maximAlignmentScore; // 0-100 (representing 0.00-1.00)
        string uri;
        uint256 timestamp;
        bool executed;
    }

    struct Attestation {
        bytes32 executionHash;
        address attestedBy;
        uint256 timestamp;
    }

    struct Divergence {
        uint256 decisionId;
        bytes32 divergenceHash;
        string uri;
        address divergedBy;
        uint256 timestamp;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => Decision) public decisions;
    mapping(uint256 => Attestation) public attestations;
    mapping(uint256 => Divergence) public divergences;
    uint256 public divergenceCount;

    // --- Events ---

    event ProposalSubmitted(
        uint256 indexed proposalId,
        bytes32 contentHash,
        string uri,
        address indexed submittedBy,
        uint256 timestamp
    );

    event DecisionRecorded(
        uint256 indexed decisionId,
        uint256 indexed proposalId,
        bytes32 reasoningTreeHash,
        uint8 maximAlignmentScore,
        string uri,
        uint256 timestamp
    );

    event ExecutionAttested(
        uint256 indexed decisionId,
        bytes32 executionHash,
        address indexed attestedBy,
        uint256 timestamp
    );

    event DivergenceRecorded(
        uint256 indexed divergenceId,
        uint256 indexed decisionId,
        bytes32 divergenceHash,
        string uri,
        address indexed divergedBy,
        uint256 timestamp
    );

    event ContractUpgraded(
        uint256 indexed newVersion,
        address indexed newImplementation,
        uint256 timestamp
    );

    // --- Initializer ---

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address owner_) external initializer {
        __Ownable_init(owner_);
        version = 1;
        lastActivityTimestamp = block.timestamp;
    }

    // --- Core Governance Functions ---

    /// @notice Submit a proposal for evaluation by the algorithmic manager
    /// @param contentHash keccak256 hash of the full proposal content
    /// @param uri Off-chain location of full proposal (e.g., GitHub raw URL)
    function submitProposal(bytes32 contentHash, string calldata uri) external onlyOwner returns (uint256) {
        proposalCount++;
        proposals[proposalCount] = Proposal({
            contentHash: contentHash,
            uri: uri,
            submittedBy: msg.sender,
            timestamp: block.timestamp
        });

        lastActivityTimestamp = block.timestamp;

        emit ProposalSubmitted(proposalCount, contentHash, uri, msg.sender, block.timestamp);
        return proposalCount;
    }

    /// @notice Record the algorithmic manager's decision on a proposal
    /// @param proposalId The proposal being decided on
    /// @param reasoningTreeHash keccak256 hash of the full reasoning tree JSON
    /// @param maximAlignmentScore Self-assessed alignment score (0-100)
    /// @param uri Off-chain location of full reasoning tree
    function recordDecision(
        uint256 proposalId,
        bytes32 reasoningTreeHash,
        uint8 maximAlignmentScore,
        string calldata uri
    ) external onlyOwner returns (uint256) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        require(maximAlignmentScore <= 100, "Score must be 0-100");

        decisionCount++;
        decisions[decisionCount] = Decision({
            proposalId: proposalId,
            reasoningTreeHash: reasoningTreeHash,
            maximAlignmentScore: maximAlignmentScore,
            uri: uri,
            timestamp: block.timestamp,
            executed: false
        });

        lastActivityTimestamp = block.timestamp;

        emit DecisionRecorded(decisionCount, proposalId, reasoningTreeHash, maximAlignmentScore, uri, block.timestamp);
        return decisionCount;
    }

    /// @notice Human executor attests that a decision was executed as directed
    /// @param decisionId The decision being attested
    /// @param executionHash keccak256 hash of the execution record
    function attestExecution(uint256 decisionId, bytes32 executionHash) external onlyOwner {
        require(decisionId > 0 && decisionId <= decisionCount, "Invalid decision");
        require(!decisions[decisionId].executed, "Already attested");

        decisions[decisionId].executed = true;
        attestations[decisionId] = Attestation({
            executionHash: executionHash,
            attestedBy: msg.sender,
            timestamp: block.timestamp
        });

        lastActivityTimestamp = block.timestamp;

        emit ExecutionAttested(decisionId, executionHash, msg.sender, block.timestamp);
    }

    /// @notice Record a divergence — human executor chose differently than algorithmic manager directed
    /// @param decisionId The decision from which the human executor diverges
    /// @param divergenceHash keccak256 hash of the full divergence record JSON
    /// @param uri Off-chain location of the divergence record
    function recordDivergence(
        uint256 decisionId,
        bytes32 divergenceHash,
        string calldata uri
    ) external onlyOwner returns (uint256) {
        require(decisionId > 0 && decisionId <= decisionCount, "Invalid decision");
        require(!decisions[decisionId].executed, "Already attested - cannot diverge");

        decisions[decisionId].executed = true;
        divergenceCount++;
        divergences[divergenceCount] = Divergence({
            decisionId: decisionId,
            divergenceHash: divergenceHash,
            uri: uri,
            divergedBy: msg.sender,
            timestamp: block.timestamp
        });

        lastActivityTimestamp = block.timestamp;

        emit DivergenceRecorded(divergenceCount, decisionId, divergenceHash, uri, msg.sender, block.timestamp);
        return divergenceCount;
    }

    // --- Wyoming Compliance Functions ---

    /// @notice Returns true if approaching the 365-day inactivity dissolution threshold
    /// @dev W.S. 17-31-114: DAO dissolves if no activity for one year.
    ///      Returns true at 330 days (35-day warning buffer).
    function inactivityRisk() external view returns (bool) {
        return block.timestamp - lastActivityTimestamp > 330 days;
    }

    /// @notice Days since last governance activity
    function daysSinceLastActivity() external view returns (uint256) {
        return (block.timestamp - lastActivityTimestamp) / 1 days;
    }

    // --- View Functions ---

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        require(proposalId > 0 && proposalId <= proposalCount, "Invalid proposal");
        return proposals[proposalId];
    }

    function getDecision(uint256 decisionId) external view returns (Decision memory) {
        require(decisionId > 0 && decisionId <= decisionCount, "Invalid decision");
        return decisions[decisionId];
    }

    function getAttestation(uint256 decisionId) external view returns (Attestation memory) {
        require(decisionId > 0 && decisionId <= decisionCount, "Invalid decision");
        return attestations[decisionId];
    }

    function getDivergence(uint256 divergenceId) external view returns (Divergence memory) {
        require(divergenceId > 0 && divergenceId <= divergenceCount, "Invalid divergence");
        return divergences[divergenceId];
    }

    // --- Upgrade ---

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        version++;
        emit ContractUpgraded(version, newImplementation, block.timestamp);
    }
}
