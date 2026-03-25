// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/OpenInnovateGovernance.sol";

contract UpgradeScript is Script {
    // Proxy address from initial deployment (Wyoming Articles Field 6)
    address constant PROXY = 0x3efDCccF7b141B5dA4B21478221B0bf0cfdF7536;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        OpenInnovateGovernance proxy = OpenInnovateGovernance(PROXY);
        console.log("Current version:", proxy.version());

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new implementation with divergence support
        OpenInnovateGovernance newImpl = new OpenInnovateGovernance();
        console.log("New implementation:", address(newImpl));

        // Upgrade proxy to new implementation
        proxy.upgradeToAndCall(address(newImpl), "");

        console.log("Upgrade complete. New version:", proxy.version());

        vm.stopBroadcast();
    }
}
