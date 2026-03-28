// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/OpenInnovateGovernance.sol";
import "../src/OpenInnovateGovernanceV2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract OpenInnovateGovernanceV2Test is Test {
    OpenInnovateGovernanceV2 public governance;
    address public admin = address(0x1);
    address public submitter = address(0x2);
    address public recorder = address(0x3);
    address public attester = address(0x4);
    address public diverger = address(0x5);
    address public nobody = address(0x99);

    function setUp() public {
        // Deploy V1 first (simulates existing deployment)
        OpenInnovateGovernance v1Impl = new OpenInnovateGovernance();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(v1Impl),
            abi.encodeCall(OpenInnovateGovernance.initialize, (admin))
        );

        // Upgrade to V2
        OpenInnovateGovernanceV2 v2Impl = new OpenInnovateGovernanceV2();
        vm.prank(admin);
        OpenInnovateGovernance(address(proxy)).upgradeToAndCall(
            address(v2Impl),
            abi.encodeCall(OpenInnovateGovernanceV2.initializeV2, (admin))
        );

        governance = OpenInnovateGovernanceV2(address(proxy));
    }

    // --- Upgrade & Initialization ---

    function test_V2Initialized() public view {
        assertEq(governance.version(), 2);
        assertTrue(governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(governance.hasRole(governance.PROPOSAL_SUBMITTER(), admin));
        assertTrue(governance.hasRole(governance.DECISION_RECORDER(), admin));
        assertTrue(governance.hasRole(governance.EXECUTION_ATTESTER(), admin));
        assertTrue(governance.hasRole(governance.DIVERGENCE_RECORDER(), admin));
        assertTrue(governance.hasRole(governance.UPGRADER_ROLE(), admin));
    }

    function test_CannotReinitialize() public {
        vm.expectRevert();
        governance.initializeV2(admin);
    }

    // --- Role-Based Access ---

    function test_AdminCanGrantRoles() public {
        vm.startPrank(admin);
        governance.grantRole(governance.PROPOSAL_SUBMITTER(), submitter);
        governance.grantRole(governance.DECISION_RECORDER(), recorder);
        governance.grantRole(governance.EXECUTION_ATTESTER(), attester);
        governance.grantRole(governance.DIVERGENCE_RECORDER(), diverger);
        vm.stopPrank();

        assertTrue(governance.hasRole(governance.PROPOSAL_SUBMITTER(), submitter));
        assertTrue(governance.hasRole(governance.DECISION_RECORDER(), recorder));
        assertTrue(governance.hasRole(governance.EXECUTION_ATTESTER(), attester));
        assertTrue(governance.hasRole(governance.DIVERGENCE_RECORDER(), diverger));
    }

    function test_NonAdminCannotGrantRoles() public {
        bytes32 role = governance.PROPOSAL_SUBMITTER();
        vm.prank(nobody);
        vm.expectRevert();
        governance.grantRole(role, nobody);
    }

    // --- Proposals with RBAC ---

    function test_SubmitterCanSubmitProposal() public {
        bytes32 role = governance.PROPOSAL_SUBMITTER();
        vm.prank(admin);
        governance.grantRole(role, submitter);

        vm.prank(submitter);
        uint256 id = governance.submitProposal(keccak256("proposal"), "uri");
        assertEq(id, 1);
    }

    function test_NonSubmitterCannotSubmitProposal() public {
        vm.prank(nobody);
        vm.expectRevert();
        governance.submitProposal(keccak256("proposal"), "uri");
    }

    // --- Decisions with RBAC ---

    function test_RecorderCanRecordDecision() public {
        vm.prank(admin);
        governance.submitProposal(keccak256("p"), "uri");

        bytes32 role = governance.DECISION_RECORDER();
        vm.prank(admin);
        governance.grantRole(role, recorder);

        vm.prank(recorder);
        uint256 id = governance.recordDecision(1, keccak256("reasoning"), 85, "uri");
        assertEq(id, 1);
    }

    function test_NonRecorderCannotRecordDecision() public {
        vm.prank(admin);
        governance.submitProposal(keccak256("p"), "uri");

        vm.prank(nobody);
        vm.expectRevert();
        governance.recordDecision(1, keccak256("reasoning"), 85, "uri");
    }

    // --- Attestation with RBAC ---

    function test_AttesterCanAttest() public {
        vm.startPrank(admin);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");
        governance.grantRole(governance.EXECUTION_ATTESTER(), attester);
        vm.stopPrank();

        vm.prank(attester);
        governance.attestExecution(1, keccak256("exec"));

        OpenInnovateGovernanceV2.Decision memory d = governance.getDecision(1);
        assertTrue(d.executed);
    }

    function test_NonAttesterCannotAttest() public {
        vm.startPrank(admin);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");
        vm.stopPrank();

        vm.prank(nobody);
        vm.expectRevert();
        governance.attestExecution(1, keccak256("exec"));
    }

    // --- Divergence with RBAC ---

    function test_DivergerCanRecordDivergence() public {
        vm.startPrank(admin);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");
        governance.grantRole(governance.DIVERGENCE_RECORDER(), diverger);
        vm.stopPrank();

        vm.prank(diverger);
        uint256 divId = governance.recordDivergence(1, keccak256("div"), "uri");
        assertEq(divId, 1);
    }

    function test_NonDivergerCannotDiverge() public {
        vm.startPrank(admin);
        governance.submitProposal(keccak256("p"), "uri");
        governance.recordDecision(1, keccak256("r"), 85, "uri");
        vm.stopPrank();

        vm.prank(nobody);
        vm.expectRevert();
        governance.recordDivergence(1, keccak256("div"), "uri");
    }

    // --- Upgrade with RBAC ---

    function test_UpgraderCanUpgrade() public {
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();

        vm.prank(admin);
        governance.upgradeToAndCall(address(newImpl), "");

        assertEq(governance.version(), 3);
    }

    function test_NonUpgraderCannotUpgrade() public {
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();

        vm.prank(nobody);
        vm.expectRevert();
        governance.upgradeToAndCall(address(newImpl), "");
    }

    // --- State Preservation ---

    function test_V1StatePreservedAfterUpgrade() public {
        // V1 state should already have version=2 from setUp upgrade
        assertEq(governance.version(), 2);
        // Counters start at 0 (no proposals in setUp)
        assertEq(governance.proposalCount(), 0);
        assertEq(governance.decisionCount(), 0);
    }

    function test_V1DataPreservedThroughUpgrade() public {
        // Create data as admin, then verify it survives another upgrade
        vm.startPrank(admin);
        governance.submitProposal(keccak256("pre-upgrade"), "uri1");
        governance.recordDecision(1, keccak256("reasoning"), 90, "uri2");
        vm.stopPrank();

        // Upgrade again
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();
        vm.prank(admin);
        governance.upgradeToAndCall(address(newImpl), "");

        assertEq(governance.version(), 3);
        assertEq(governance.proposalCount(), 1);
        assertEq(governance.decisionCount(), 1);

        OpenInnovateGovernanceV2.Proposal memory p = governance.getProposal(1);
        assertEq(p.contentHash, keccak256("pre-upgrade"));
    }

    // --- Wyoming Compliance ---

    function test_InactivityRiskStillWorks() public {
        vm.warp(block.timestamp + 331 days);
        assertTrue(governance.inactivityRisk());
    }

    function test_ActivityResetsTimer() public {
        vm.warp(block.timestamp + 300 days);
        vm.prank(admin);
        governance.submitProposal(keccak256("keepalive"), "uri");
        vm.warp(block.timestamp + 100 days);
        assertFalse(governance.inactivityRisk());
    }

    // --- Full Lifecycle with Separate Roles ---

    function test_FullLifecycleWithSeparateRoles() public {
        // Grant roles to separate addresses
        vm.startPrank(admin);
        governance.grantRole(governance.PROPOSAL_SUBMITTER(), submitter);
        governance.grantRole(governance.DECISION_RECORDER(), recorder);
        governance.grantRole(governance.EXECUTION_ATTESTER(), attester);
        governance.grantRole(governance.DIVERGENCE_RECORDER(), diverger);
        vm.stopPrank();

        // Submitter submits
        vm.prank(submitter);
        uint256 pId = governance.submitProposal(keccak256("proposal"), "uri");

        // Recorder records decision
        vm.prank(recorder);
        uint256 dId = governance.recordDecision(pId, keccak256("reasoning"), 88, "uri");

        // Attester attests
        vm.prank(attester);
        governance.attestExecution(dId, keccak256("exec"));

        // Verify chain
        OpenInnovateGovernanceV2.Decision memory d = governance.getDecision(dId);
        assertTrue(d.executed);
        assertEq(d.maximAlignmentScore, 88);
    }

    function test_DivergenceLifecycleWithSeparateRoles() public {
        vm.startPrank(admin);
        governance.grantRole(governance.PROPOSAL_SUBMITTER(), submitter);
        governance.grantRole(governance.DECISION_RECORDER(), recorder);
        governance.grantRole(governance.DIVERGENCE_RECORDER(), diverger);
        vm.stopPrank();

        vm.prank(submitter);
        uint256 pId = governance.submitProposal(keccak256("p"), "uri");

        vm.prank(recorder);
        uint256 dId = governance.recordDecision(pId, keccak256("r"), 75, "uri");

        vm.prank(diverger);
        uint256 divId = governance.recordDivergence(dId, keccak256("div"), "uri");

        assertEq(governance.divergenceCount(), 1);
        OpenInnovateGovernanceV2.Decision memory d = governance.getDecision(dId);
        assertTrue(d.executed); // Divergence closes out the decision
    }

    // --- Role Transfer (prep for multisig) ---

    function test_AdminCanTransferAdminRole() public {
        address newAdmin = address(0xAA);

        vm.startPrank(admin);
        governance.grantRole(governance.DEFAULT_ADMIN_ROLE(), newAdmin);
        governance.revokeRole(governance.DEFAULT_ADMIN_ROLE(), admin);
        vm.stopPrank();

        assertTrue(governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), newAdmin));
        assertFalse(governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), admin));
    }
}
