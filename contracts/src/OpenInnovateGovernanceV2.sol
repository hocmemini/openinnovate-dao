// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

/// @title OpenInnovate DAO LLC — Governance Contract V2
/// @notice On-chain governance provenance for Wyoming DAO LLC (W.S. 17-31-104)
/// @dev UUPS upgradeable proxy. V2 replaces OwnableUpgradeable with AccessControl
///      for role-based permissions. Existing state layout preserved for upgrade safety.
///      Algorithmic manager = Claude (Anthropic API), operating off-chain.
///      This contract records decision hashes, not decision logic.
contract OpenInnovateGovernanceV2 is Initializable, UUPSUpgradeable, AccessControlUpgradeable {

    // --- Roles ---

    bytes32 public constant PROPOSAL_SUBMITTER = keccak256("PROPOSAL_SUBMITTER");
    bytes32 public constant DECISION_RECORDER = keccak256("DECISION_RECORDER");
    bytes32 public constant EXECUTION_ATTESTER = keccak256("EXECUTION_ATTESTER");
    bytes32 public constant DIVERGENCE_RECORDER = keccak256("DIVERGENCE_RECORDER");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // --- State (layout must match V1 exactly for upgrade safety) ---

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
        uint8 maximAlignmentScore; // 0-100
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

    /// @notice V2 reinitializer — sets up AccessControl roles
    /// @dev Called via upgradeToAndCall. The admin address gets all roles initially.
    ///      Roles can then be transferred to multisig/timelock.
    function initializeV2(address admin) external reinitializer(2) {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PROPOSAL_SUBMITTER, admin);
        _grantRole(DECISION_RECORDER, admin);
        _grantRole(EXECUTION_ATTESTER, admin);
        _grantRole(DIVERGENCE_RECORDER, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    // --- Core Governance Functions ---

    function submitProposal(bytes32 contentHash, string calldata uri)
        external
        onlyRole(PROPOSAL_SUBMITTER)
        returns (uint256)
    {
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

    function recordDecision(
        uint256 proposalId,
        bytes32 reasoningTreeHash,
        uint8 maximAlignmentScore,
        string calldata uri
    ) external onlyRole(DECISION_RECORDER) returns (uint256) {
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

    function attestExecution(uint256 decisionId, bytes32 executionHash)
        external
        onlyRole(EXECUTION_ATTESTER)
    {
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

    function recordDivergence(
        uint256 decisionId,
        bytes32 divergenceHash,
        string calldata uri
    ) external onlyRole(DIVERGENCE_RECORDER) returns (uint256) {
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

    function inactivityRisk() external view returns (bool) {
        return block.timestamp - lastActivityTimestamp > 330 days;
    }

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

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {
        version++;
        emit ContractUpgraded(version, newImplementation, block.timestamp);
    }
}
