async function main() {
    const MyNFT = await ethers.getContractFactory("MyNFT");
    
    console.log("Deploying MyNFT...");
    const myNFT = await MyNFT.deploy();

    // Ethers v6 standard: wait for the deployment to finish
    await myNFT.waitForDeployment();

    // Ethers v6 standard: use .target instead of .address
    console.log("MyNFT deployed to:", myNFT.target);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

