// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";

/// @title Deploy TimelockController for OpenInnovate DAO
/// @notice Deploys a 7-day TimelockController. HE wallet is proposer, executor,
///         canceller, and admin. Timelock will later receive UPGRADER_ROLE and
///         DEFAULT_ADMIN_ROLE from the governance proxy.
contract DeployTimelockScript is Script {
    uint256 constant MIN_DELAY = 7 days; // 604800 seconds

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deployer:", deployer);
        console.log("Min delay:", MIN_DELAY);

        address[] memory proposers = new address[](1);
        proposers[0] = deployer;

        address[] memory executors = new address[](1);
        executors[0] = deployer;

        vm.startBroadcast(deployerPrivateKey);

        TimelockController timelock = new TimelockController(
            MIN_DELAY,
            proposers,
            executors,
            deployer // admin — can later be renounced or transferred to multisig
        );

        console.log("TimelockController deployed:", address(timelock));
        console.log("Min delay (seconds):", timelock.getMinDelay());

        vm.stopBroadcast();
    }
}
