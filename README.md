# Blockchain-DApp-Portal
Blockchain-Based Decentralized Application for Counterfeit Product Detection and Prevention

This project is a decentralized application (DApp) for product verification built on the Ethereum blockchain. It allows users to verify the authenticity of products by interacting with a smart contract.

## Project Structure

- **contracts/**: Contains the smart contracts for the application.
  - `Migrations.sol`: Manages the migration process for deploying other contracts.
  - `ProductVerification.sol`: Main smart contract for product verification, including functions for verifying and managing product data.

- **migrations/**: Contains migration scripts for deploying contracts to the blockchain.
  - `1_initial_migration.js`: Deploys the Migrations contract.
  - `2_deploy_product_verification.js`: Deploys the ProductVerification contract.

- **src/**: Contains the front-end files for the application.
  - `index.html`: Main HTML file serving as the entry point for the web interface.
  - `css/style.css`: Styles for the web application.
  - `js/app.js`: Handles front-end logic and user interactions.
  - `js/contract.js`: Interacts with the smart contract and blockchain.

- **test/**: Contains test cases for the smart contract.
  - `productVerification.test.js`: Ensures that the ProductVerification contract functions as expected.

- **truffle-config.js**: Configuration file for Truffle, specifying network settings and compiler options.

- **package.json**: Configuration file for npm, listing dependencies and scripts.

## Setup Instructions

1. **Install Dependencies**: Run `npm install` in the project root to install the required packages.

2. **Compile Contracts**: Run `truffle compile` to compile the smart contracts.

3. **Deploy Contracts**: Run `truffle migrate --reset` to deploy the contracts to the blockchain.

4. **Serve the Application**: Use `python -m http.server 8000` to serve the application from the repository root.

5. **Access the Application**: Open your web browser and navigate to `http://localhost:8000/src/index.html` to use the application.

## Usage

- Users can add products and verify their authenticity through the web interface.
- The smart contract manages product data and verification processes on the blockchain.

## Testing

Run the tests for the ProductVerification contract using the command:

```
truffle test
```

This will execute the test cases defined in `test/productVerification.test.js`.

## License

This project is licensed under the MIT License.
