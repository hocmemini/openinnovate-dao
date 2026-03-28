// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/OpenInnovateGovernanceV2.sol";

/// @title Transfer admin/upgrader roles to TimelockController
/// @notice After running this, contract upgrades and role changes require a 7-day
///         timelock delay. HE wallet retains operational roles directly.
///
/// @dev Run AFTER DeployTimelock.s.sol. Set TIMELOCK_ADDRESS env var.
///
///      Role transfer:
///        UPGRADER_ROLE      → timelock (upgrades gated by 7-day delay)
///        DEFAULT_ADMIN_ROLE → timelock (role grants/revokes gated by 7-day delay)
///
///      Retained by HE wallet:
///        PROPOSAL_SUBMITTER, DECISION_RECORDER, EXECUTION_ATTESTER, DIVERGENCE_RECORDER
contract TransferToTimelockScript is Script {
    address constant PROXY = 0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address timelock = vm.envAddress("TIMELOCK_ADDRESS");

        OpenInnovateGovernanceV2 governance = OpenInnovateGovernanceV2(PROXY);

        console.log("Proxy:", PROXY);
        console.log("Deployer:", deployer);
        console.log("Timelock:", timelock);

        // Verify current state
        require(governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), deployer), "deployer must be admin");
        require(governance.hasRole(governance.UPGRADER_ROLE(), deployer), "deployer must have UPGRADER_ROLE");

        vm.startBroadcast(deployerPrivateKey);

        // Grant roles to timelock
        governance.grantRole(governance.UPGRADER_ROLE(), timelock);
        governance.grantRole(governance.DEFAULT_ADMIN_ROLE(), timelock);

        // Revoke roles from deployer
        governance.revokeRole(governance.UPGRADER_ROLE(), deployer);
        governance.renounceRole(governance.DEFAULT_ADMIN_ROLE(), deployer);

        vm.stopBroadcast();

        // Verify transfer
        console.log("--- Post-transfer verification ---");
        console.log("Timelock has UPGRADER_ROLE:", governance.hasRole(governance.UPGRADER_ROLE(), timelock));
        console.log("Timelock has DEFAULT_ADMIN_ROLE:", governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), timelock));
        console.log("Deployer has UPGRADER_ROLE:", governance.hasRole(governance.UPGRADER_ROLE(), deployer));
        console.log("Deployer has DEFAULT_ADMIN_ROLE:", governance.hasRole(governance.DEFAULT_ADMIN_ROLE(), deployer));
        console.log("Deployer retains PROPOSAL_SUBMITTER:", governance.hasRole(governance.PROPOSAL_SUBMITTER(), deployer));
        console.log("Deployer retains DECISION_RECORDER:", governance.hasRole(governance.DECISION_RECORDER(), deployer));
        console.log("Deployer retains EXECUTION_ATTESTER:", governance.hasRole(governance.EXECUTION_ATTESTER(), deployer));
        console.log("Deployer retains DIVERGENCE_RECORDER:", governance.hasRole(governance.DIVERGENCE_RECORDER(), deployer));
    }
}
