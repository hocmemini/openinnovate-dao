// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/OpenInnovateGovernance.sol";
import "../src/OpenInnovateGovernanceV2.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title TimelockController Integration Tests
/// @notice Tests the full security model: V2 RBAC + TimelockController.
///         Verifies that after role transfer, upgrades require 7-day timelock
///         while operational governance functions remain direct.
contract TimelockIntegrationTest is Test {
    OpenInnovateGovernanceV2 public governance;
    TimelockController public timelock;
    ERC1967Proxy public proxy;

    address public admin = address(0x1);
    address public nobody = address(0x99);

    uint256 constant MIN_DELAY = 7 days;
    bytes32 constant ZERO_SALT = bytes32(0);
    bytes32 constant ZERO_PREDECESSOR = bytes32(0);

    function setUp() public {
        // 1. Deploy V1
        OpenInnovateGovernance v1Impl = new OpenInnovateGovernance();
        proxy = new ERC1967Proxy(
            address(v1Impl),
            abi.encodeCall(OpenInnovateGovernance.initialize, (admin))
        );

        // 2. Upgrade to V2
        OpenInnovateGovernanceV2 v2Impl = new OpenInnovateGovernanceV2();
        vm.prank(admin);
        OpenInnovateGovernance(address(proxy)).upgradeToAndCall(
            address(v2Impl),
            abi.encodeCall(OpenInnovateGovernanceV2.initializeV2, (admin))
        );
        governance = OpenInnovateGovernanceV2(address(proxy));

        // 3. Deploy TimelockController — admin is proposer, executor, and admin
        address[] memory proposers = new address[](1);
        proposers[0] = admin;
        address[] memory executors = new address[](1);
        executors[0] = admin;

        timelock = new TimelockController(MIN_DELAY, proposers, executors, admin);

        // 4. Transfer UPGRADER_ROLE and DEFAULT_ADMIN_ROLE to timelock
        vm.startPrank(admin);
        governance.grantRole(governance.UPGRADER_ROLE(), address(timelock));
        governance.grantRole(governance.DEFAULT_ADMIN_ROLE(), address(timelock));
        governance.revokeRole(governance.UPGRADER_ROLE(), admin);
        governance.renounceRole(governance.DEFAULT_ADMIN_ROLE(), admin);
        vm.stopPrank();
    }

    // --- Role Transfer Verification ---

    function test_TimelockHasAdminAndUpgraderRoles() public view {
        assertTrue(governance.hasRole(governance.UPGRADER_ROLE(), address(timelock)));
        assertTrue(governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), address(timelock)));
    }

    function test_AdminLostAdminAndUpgraderRoles() public view {
        assertFalse(governance.hasRole(governance.UPGRADER_ROLE(), admin));
        assertFalse(governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_AdminRetainsOperationalRoles() public view {
        assertTrue(governance.hasRole(governance.PROPOSAL_SUBMITTER(), admin));
        assertTrue(governance.hasRole(governance.DECISION_RECORDER(), admin));
        assertTrue(governance.hasRole(governance.EXECUTION_ATTESTER(), admin));
        assertTrue(governance.hasRole(governance.DIVERGENCE_RECORDER(), admin));
    }

    // --- Direct Upgrade Blocked ---

    function test_DirectUpgradeByAdminReverts() public {
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();
        vm.prank(admin);
        vm.expectRevert();
        governance.upgradeToAndCall(address(newImpl), "");
    }

    function test_DirectUpgradeByNobodyReverts() public {
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();
        vm.prank(nobody);
        vm.expectRevert();
        governance.upgradeToAndCall(address(newImpl), "");
    }

    // --- Timelocked Upgrade Succeeds ---

    function test_UpgradeViaTimelockAfterDelay() public {
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();

        // Build the upgrade call data
        bytes memory upgradeCall = abi.encodeCall(
            governance.upgradeToAndCall, (address(newImpl), "")
        );

        // Schedule the upgrade
        vm.prank(admin);
        timelock.schedule(
            address(governance),
            0,
            upgradeCall,
            ZERO_PREDECESSOR,
            ZERO_SALT,
            MIN_DELAY
        );

        // Verify it's pending
        bytes32 opId = timelock.hashOperation(
            address(governance), 0, upgradeCall, ZERO_PREDECESSOR, ZERO_SALT
        );
        assertTrue(timelock.isOperationPending(opId));

        // Warp past the delay
        vm.warp(block.timestamp + MIN_DELAY);
        assertTrue(timelock.isOperationReady(opId));

        // Execute the upgrade
        vm.prank(admin);
        timelock.execute(
            address(governance),
            0,
            upgradeCall,
            ZERO_PREDECESSOR,
            ZERO_SALT
        );

        // Verify upgrade succeeded (version increments in _authorizeUpgrade)
        assertTrue(timelock.isOperationDone(opId));
    }

    // --- Execute Before Delay Reverts ---

    function test_UpgradeBeforeDelayReverts() public {
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();
        bytes memory upgradeCall = abi.encodeCall(
            governance.upgradeToAndCall, (address(newImpl), "")
        );

        vm.prank(admin);
        timelock.schedule(
            address(governance), 0, upgradeCall, ZERO_PREDECESSOR, ZERO_SALT, MIN_DELAY
        );

        // Try to execute immediately (should revert)
        vm.prank(admin);
        vm.expectRevert();
        timelock.execute(
            address(governance), 0, upgradeCall, ZERO_PREDECESSOR, ZERO_SALT
        );
    }

    // --- Cancel Scheduled Operation ---

    function test_CancelScheduledUpgrade() public {
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();
        bytes memory upgradeCall = abi.encodeCall(
            governance.upgradeToAndCall, (address(newImpl), "")
        );

        vm.prank(admin);
        timelock.schedule(
            address(governance), 0, upgradeCall, ZERO_PREDECESSOR, ZERO_SALT, MIN_DELAY
        );

        bytes32 opId = timelock.hashOperation(
            address(governance), 0, upgradeCall, ZERO_PREDECESSOR, ZERO_SALT
        );
        assertTrue(timelock.isOperationPending(opId));

        // Cancel it (admin has CANCELLER_ROLE since OZ grants it to all proposers)
        vm.prank(admin);
        timelock.cancel(opId);

        // Verify cancelled
        assertFalse(timelock.isOperationPending(opId));
        assertFalse(timelock.isOperationReady(opId));
    }

    // --- Non-Proposer Cannot Schedule ---

    function test_NonProposerCannotSchedule() public {
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();
        bytes memory upgradeCall = abi.encodeCall(
            governance.upgradeToAndCall, (address(newImpl), "")
        );

        vm.prank(nobody);
        vm.expectRevert();
        timelock.schedule(
            address(governance), 0, upgradeCall, ZERO_PREDECESSOR, ZERO_SALT, MIN_DELAY
        );
    }

    // --- Operational Functions Still Work Without Timelock ---

    function test_SubmitProposalStillWorksDirect() public {
        bytes32 hash = keccak256("test-proposal");
        vm.prank(admin);
        governance.submitProposal(hash, "https://example.com/proposal");
        assertEq(governance.proposalCount(), 1);
    }

    function test_RecordDecisionStillWorksDirect() public {
        // Submit a proposal first
        vm.prank(admin);
        governance.submitProposal(keccak256("test"), "https://example.com");

        // Record decision directly — no timelock needed
        vm.prank(admin);
        governance.recordDecision(1, keccak256("decision"), 85, "https://example.com/decision");
        assertEq(governance.decisionCount(), 1);
    }

    function test_FullGovernanceLifecycleWithoutTimelock() public {
        // Submit proposal
        vm.prank(admin);
        governance.submitProposal(keccak256("lifecycle-prop"), "https://example.com/prop");

        // Record decision
        vm.prank(admin);
        governance.recordDecision(1, keccak256("lifecycle-dec"), 90, "https://example.com/dec");

        // Attest execution
        vm.prank(admin);
        governance.attestExecution(1, keccak256("lifecycle-exec"));

        // Verify all state
        assertEq(governance.proposalCount(), 1);
        assertEq(governance.decisionCount(), 1);
    }

    // --- Role Changes Require Timelock ---

    function test_AdminCannotGrantRolesDirectly() public {
        // Admin no longer has DEFAULT_ADMIN_ROLE, so cannot grant roles
        // Note: cache role constant before prank to avoid staticcall consuming it
        bytes32 role = governance.PROPOSAL_SUBMITTER();
        vm.prank(admin);
        vm.expectRevert();
        governance.grantRole(role, nobody);
    }

    function test_GrantRoleViaTimelock() public {
        bytes memory grantCall = abi.encodeCall(
            governance.grantRole, (governance.PROPOSAL_SUBMITTER(), nobody)
        );

        // Schedule role grant
        vm.prank(admin);
        timelock.schedule(
            address(governance), 0, grantCall, ZERO_PREDECESSOR, ZERO_SALT, MIN_DELAY
        );

        // Warp and execute
        vm.warp(block.timestamp + MIN_DELAY);
        vm.prank(admin);
        timelock.execute(
            address(governance), 0, grantCall, ZERO_PREDECESSOR, ZERO_SALT
        );

        assertTrue(governance.hasRole(governance.PROPOSAL_SUBMITTER(), nobody));
    }
}
