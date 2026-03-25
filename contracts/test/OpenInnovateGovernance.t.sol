// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/OpenInnovateGovernance.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract OpenInnovateGovernanceTest is Test {
    OpenInnovateGovernance public governance;
    OpenInnovateGovernance public impl;
    address public owner = address(0x1);
    address public nonOwner = address(0x2);

    function setUp() public {
        impl = new OpenInnovateGovernance();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeCall(OpenInnovateGovernance.initialize, (owner))
        );
        governance = OpenInnovateGovernance(address(proxy));
    }

    // --- Initialization ---

    function test_Initialize() public view {
        assertEq(governance.owner(), owner);
        assertEq(governance.version(), 1);
        assertEq(governance.proposalCount(), 0);
        assertEq(governance.decisionCount(), 0);
    }

    function test_CannotInitializeTwice() public {
        vm.expectRevert();
        governance.initialize(owner);
    }

    function test_ImplementationCannotBeInitialized() public {
        vm.expectRevert();
        impl.initialize(owner);
    }

    // --- Proposals ---

    function test_SubmitProposal() public {
        bytes32 hash = keccak256("proposal content");
        string memory uri = "https://github.com/openinnovate-dao/decisions/proposal-001.json";

        vm.prank(owner);
        uint256 id = governance.submitProposal(hash, uri);

        assertEq(id, 1);
        assertEq(governance.proposalCount(), 1);

        OpenInnovateGovernance.Proposal memory p = governance.getProposal(1);
        assertEq(p.contentHash, hash);
        assertEq(p.submittedBy, owner);
    }

    function test_SubmitProposalEmitsEvent() public {
        bytes32 hash = keccak256("proposal content");

        vm.prank(owner);
        vm.expectEmit(true, true, false, true);
        emit OpenInnovateGovernance.ProposalSubmitted(1, hash, "uri", owner, block.timestamp);
        governance.submitProposal(hash, "uri");
    }

    function test_SubmitProposalUpdatesActivity() public {
        vm.warp(1000);
        vm.prank(owner);
        governance.submitProposal(keccak256("test"), "uri");
        assertEq(governance.lastActivityTimestamp(), 1000);
    }

    function test_OnlyOwnerCanSubmitProposal() public {
        vm.prank(nonOwner);
        vm.expectRevert();
        governance.submitProposal(keccak256("test"), "uri");
    }

    function test_MultipleProposals() public {
        vm.startPrank(owner);
        uint256 id1 = governance.submitProposal(keccak256("p1"), "uri1");
        uint256 id2 = governance.submitProposal(keccak256("p2"), "uri2");
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(governance.proposalCount(), 2);
    }

    // --- Decisions ---

    function test_RecordDecision() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("proposal"), "uri");

        bytes32 reasoningHash = keccak256("reasoning tree");
        uint256 id = governance.recordDecision(1, reasoningHash, 85, "decision-uri");
        vm.stopPrank();

        assertEq(id, 1);
        assertEq(governance.decisionCount(), 1);

        OpenInnovateGovernance.Decision memory d = governance.getDecision(1);
        assertEq(d.proposalId, 1);
        assertEq(d.reasoningTreeHash, reasoningHash);
        assertEq(d.maximAlignmentScore, 85);
        assertFalse(d.executed);
    }

    function test_RecordDecisionEmitsEvent() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("proposal"), "uri");

        bytes32 reasoningHash = keccak256("reasoning tree");
        vm.expectEmit(true, true, false, true);
        emit OpenInnovateGovernance.DecisionRecorded(1, 1, reasoningHash, 85, "uri", block.timestamp);
        governance.recordDecision(1, reasoningHash, 85, "uri");
        vm.stopPrank();
    }

    function test_DecisionRequiresValidProposal() public {
        vm.prank(owner);
        vm.expectRevert("Invalid proposal");
        governance.recordDecision(1, keccak256("test"), 50, "uri");
    }

    function test_DecisionRequiresValidScore() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");

        vm.expectRevert("Score must be 0-100");
        governance.recordDecision(1, keccak256("test"), 101, "uri");
        vm.stopPrank();
    }

    function test_OnlyOwnerCanRecordDecision() public {
        vm.prank(owner);
        governance.submitProposal(keccak256("p"), "uri");

        vm.prank(nonOwner);
        vm.expectRevert();
        governance.recordDecision(1, keccak256("test"), 50, "uri");
    }

    // --- Attestation ---

    function test_AttestExecution() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("reasoning"), 85, "uri");

        bytes32 execHash = keccak256("execution record");
        governance.attestExecution(1, execHash);
        vm.stopPrank();

        OpenInnovateGovernance.Decision memory d = governance.getDecision(1);
        assertTrue(d.executed);

        OpenInnovateGovernance.Attestation memory a = governance.getAttestation(1);
        assertEq(a.executionHash, execHash);
        assertEq(a.attestedBy, owner);
    }

    function test_AttestEmitsEvent() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");

        bytes32 execHash = keccak256("exec");
        vm.expectEmit(true, true, false, true);
        emit OpenInnovateGovernance.ExecutionAttested(1, execHash, owner, block.timestamp);
        governance.attestExecution(1, execHash);
        vm.stopPrank();
    }

    function test_CannotAttestTwice() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");
        governance.attestExecution(1, keccak256("exec"));

        vm.expectRevert("Already attested");
        governance.attestExecution(1, keccak256("exec2"));
        vm.stopPrank();
    }

    function test_CannotAttestInvalidDecision() public {
        vm.prank(owner);
        vm.expectRevert("Invalid decision");
        governance.attestExecution(1, keccak256("exec"));
    }

    function test_OnlyOwnerCanAttest() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");
        vm.stopPrank();

        vm.prank(nonOwner);
        vm.expectRevert();
        governance.attestExecution(1, keccak256("exec"));
    }

    // --- Divergence ---

    function test_RecordDivergence() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");

        bytes32 divHash = keccak256("divergence: executor disagrees with recommendation");
        uint256 divId = governance.recordDivergence(1, divHash, "divergence-uri");
        vm.stopPrank();

        assertEq(divId, 1);
        assertEq(governance.divergenceCount(), 1);

        // Decision should be marked executed (closed out)
        OpenInnovateGovernance.Decision memory d = governance.getDecision(1);
        assertTrue(d.executed);

        OpenInnovateGovernance.Divergence memory div = governance.getDivergence(1);
        assertEq(div.decisionId, 1);
        assertEq(div.divergenceHash, divHash);
        assertEq(div.divergedBy, owner);
    }

    function test_DivergenceEmitsEvent() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");

        bytes32 divHash = keccak256("divergence");
        vm.expectEmit(true, true, true, true);
        emit OpenInnovateGovernance.DivergenceRecorded(1, 1, divHash, "uri", owner, block.timestamp);
        governance.recordDivergence(1, divHash, "uri");
        vm.stopPrank();
    }

    function test_CannotDivergeAfterAttestation() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");
        governance.attestExecution(1, keccak256("exec"));

        vm.expectRevert("Already attested - cannot diverge");
        governance.recordDivergence(1, keccak256("div"), "uri");
        vm.stopPrank();
    }

    function test_CannotAttestAfterDivergence() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");
        governance.recordDivergence(1, keccak256("div"), "uri");

        vm.expectRevert("Already attested");
        governance.attestExecution(1, keccak256("exec"));
        vm.stopPrank();
    }

    function test_CannotDivergeInvalidDecision() public {
        vm.prank(owner);
        vm.expectRevert("Invalid decision");
        governance.recordDivergence(1, keccak256("div"), "uri");
    }

    function test_OnlyOwnerCanDiverge() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");
        vm.stopPrank();

        vm.prank(nonOwner);
        vm.expectRevert();
        governance.recordDivergence(1, keccak256("div"), "uri");
    }

    function test_DivergenceUpdatesActivity() public {
        vm.warp(1000);
        vm.startPrank(owner);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");

        vm.warp(2000);
        governance.recordDivergence(1, keccak256("div"), "uri");
        vm.stopPrank();

        assertEq(governance.lastActivityTimestamp(), 2000);
    }

    // --- Inactivity ---

    function test_NoInactivityRiskInitially() public view {
        assertFalse(governance.inactivityRisk());
    }

    function test_InactivityRiskAfter330Days() public {
        vm.warp(block.timestamp + 331 days);
        assertTrue(governance.inactivityRisk());
    }

    function test_NoInactivityRiskAt329Days() public {
        vm.warp(block.timestamp + 329 days);
        assertFalse(governance.inactivityRisk());
    }

    function test_ActivityResetsInactivityTimer() public {
        vm.warp(block.timestamp + 300 days);
        vm.prank(owner);
        governance.submitProposal(keccak256("keepalive"), "uri");

        vm.warp(block.timestamp + 100 days);
        assertFalse(governance.inactivityRisk());
    }

    function test_DaysSinceLastActivity() public {
        vm.warp(block.timestamp + 10 days);
        assertEq(governance.daysSinceLastActivity(), 10);
    }

    // --- Full Lifecycle ---

    function test_FullGovernanceLifecycle() public {
        vm.startPrank(owner);

        // Submit proposal
        bytes32 proposalHash = keccak256("Strategic Direction Proposal #001");
        uint256 pId = governance.submitProposal(proposalHash, "ipfs://proposal-001");
        assertEq(pId, 1);

        // Record decision
        bytes32 reasoningHash = keccak256("Full reasoning tree with maxim alignment analysis");
        uint256 dId = governance.recordDecision(1, reasoningHash, 92, "ipfs://decision-001");
        assertEq(dId, 1);

        // Attest execution
        bytes32 execHash = keccak256("Human executor confirms: action taken as directed");
        governance.attestExecution(1, execHash);

        // Verify full chain
        OpenInnovateGovernance.Proposal memory p = governance.getProposal(1);
        OpenInnovateGovernance.Decision memory d = governance.getDecision(1);
        OpenInnovateGovernance.Attestation memory a = governance.getAttestation(1);

        assertEq(p.contentHash, proposalHash);
        assertEq(d.reasoningTreeHash, reasoningHash);
        assertEq(d.maximAlignmentScore, 92);
        assertTrue(d.executed);
        assertEq(a.executionHash, execHash);
        assertEq(a.attestedBy, owner);

        vm.stopPrank();
    }

    // --- Upgrade ---

    function test_UpgradeIncreasesVersion() public {
        OpenInnovateGovernance newImpl = new OpenInnovateGovernance();

        vm.prank(owner);
        governance.upgradeToAndCall(address(newImpl), "");

        assertEq(governance.version(), 2);
    }

    function test_OnlyOwnerCanUpgrade() public {
        OpenInnovateGovernance newImpl = new OpenInnovateGovernance();

        vm.prank(nonOwner);
        vm.expectRevert();
        governance.upgradeToAndCall(address(newImpl), "");
    }

    function test_StatePreservedAfterUpgrade() public {
        vm.startPrank(owner);
        governance.submitProposal(keccak256("pre-upgrade"), "uri");
        governance.recordDecision(1, keccak256("reasoning"), 75, "uri");

        OpenInnovateGovernance newImpl = new OpenInnovateGovernance();
        governance.upgradeToAndCall(address(newImpl), "");

        // State preserved
        assertEq(governance.proposalCount(), 1);
        assertEq(governance.decisionCount(), 1);
        assertEq(governance.version(), 2);

        OpenInnovateGovernance.Proposal memory p = governance.getProposal(1);
        assertEq(p.contentHash, keccak256("pre-upgrade"));
        vm.stopPrank();
    }
}
