// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/OpenInnovateGovernance.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying OpenInnovate Governance...");
        console.log("Deployer / Owner:", deployer);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy implementation
        OpenInnovateGovernance impl = new OpenInnovateGovernance();
        console.log("Implementation:", address(impl));

        // 2. Deploy UUPS proxy pointing to implementation, calling initialize
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(impl),
            abi.encodeCall(OpenInnovateGovernance.initialize, (deployer))
        );
        console.log("============================================");
        console.log("  PROXY ADDRESS (Wyoming Articles Field 6)");
        console.log("  ", address(proxy));
        console.log("============================================");

        // 3. Verify initialization
        OpenInnovateGovernance gov = OpenInnovateGovernance(address(proxy));
        console.log("Owner:", gov.owner());
        console.log("Version:", gov.version());

        vm.stopBroadcast();
    }
}
