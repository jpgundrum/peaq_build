# GETTING STARTED with peaq sdk
Simple project allows the user to connect to the AGUNG testnet and use the peaq sdk to setup a decentralized ID, intitalize roles, read previously created DID information, etc

## Installation and setup
1. **Install Node.js and npm**

    In order to get started you must have [Node.js](https://nodejs.org/en) and npm package manager downloaded on your computer.

2. **Install Dependencies**

    Next you must install all of the dependencies located in the package.json file to have proper version control

    ```npm install```

3. **Establish .env file**

    To protect your wallet it is important to setup a .env file where you can hide your MNEMONIC seed phrase and OWNER address. To do this create a new [polkadot wallet](https://polkadot.js.org/extension/). Write down your seed phrase in a safe place and obtain your wallet's address. Next create a new file in this repositroy called .env. Set MNEMONIC="my random seed phrase" and OWNER="5EF5EF5EFxxxxxx". Next you will need to obtain AGUNG testnet tokens. You can access this facuet on the peaq discord with these [directions](https://docs.peaq.network/docs/learn/token-and-token-utility/agung-token-faucet/). Before ever committing to a new location make sure that .env is in your .gitignore so your seed phrase does not get compromised.

## Run script / Tests
Can start the script with cmd:
```npm start```

This will start the main script execution by calling index.js. (Used index.js so unit tests won't execute peaq_sdk on import)

Can execute the tests to see results and coverage with cmd:
```npm test```

## Github Actions
Added .github/workflows/test_api.yml to execute tests and post test results to this github repository each time new code is pushed to main