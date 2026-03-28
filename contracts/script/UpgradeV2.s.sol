// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/OpenInnovateGovernance.sol";
import "../src/OpenInnovateGovernanceV2.sol";

/// @title Upgrade to V2 — AccessControl RBAC
/// @notice Deploys new V2 implementation and upgrades proxy via upgradeToAndCall.
///         The current owner (HE wallet) gets all roles initially.
///         Roles are later transferred to multisig+timelock.
contract UpgradeV2Script is Script {
    address constant PROXY = 0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        OpenInnovateGovernance proxyV1 = OpenInnovateGovernance(PROXY);
        console.log("Current version:", proxyV1.version());
        console.log("Current owner:", proxyV1.owner());
        console.log("Proposals:", proxyV1.proposalCount());
        console.log("Decisions:", proxyV1.decisionCount());

        vm.startBroadcast(deployerPrivateKey);

        // Deploy V2 implementation
        OpenInnovateGovernanceV2 newImpl = new OpenInnovateGovernanceV2();
        console.log("V2 implementation:", address(newImpl));

        // Upgrade proxy to V2 and initialize roles
        // initializeV2 grants all roles to the deployer (HE wallet)
        proxyV1.upgradeToAndCall(
            address(newImpl),
            abi.encodeCall(OpenInnovateGovernanceV2.initializeV2, (deployer))
        );

        // Verify upgrade
        OpenInnovateGovernanceV2 proxyV2 = OpenInnovateGovernanceV2(PROXY);
        console.log("New version:", proxyV2.version());
        console.log("Proposals preserved:", proxyV2.proposalCount());
        console.log("Decisions preserved:", proxyV2.decisionCount());
        console.log("Admin has DEFAULT_ADMIN_ROLE:", proxyV2.hasRole(proxyV2.DEFAULT_ADMIN_ROLE(), deployer));
        console.log("Admin has PROPOSAL_SUBMITTER:", proxyV2.hasRole(proxyV2.PROPOSAL_SUBMITTER(), deployer));

        vm.stopBroadcast();
    }
}
