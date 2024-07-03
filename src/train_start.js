// import WIP sdk
import { Sdk }from './../../../peaq_sdk/peaq-js/dist/packages/sdk/src/index.js';

//const { SDK } = pkg;

// import polkadot & ethers functions to create new user wallets and interact with the erc-20 agung contract
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto';
import BN from 'bn.js';

// env vars
import dotenv from 'dotenv';
dotenv.config();
const OWNER_SEED = process.env.MNEMONIC; // seed phrase of owner

// set WSS url for interaction
const WSS_URL = "wss://wsspc1-qa.agung.peaq.network";


// create a keyring object and send tokens to the user to have them interact
async function createOwner(){
    await cryptoWaitReady();
    const owner_keyring = new Keyring({ type: "sr25519" }); 
    const OwnerPair = owner_keyring.addFromUri(OWNER_SEED);

    return OwnerPair;
}

async function generateTrain(){
    // will typically generate mnemonic, but for testing it will be hard-coded
   // const mnemonic = mnemonicGenerate();

   // make sure this mnemonic is accessible so it can be used when creating an instance of the SDK
    const mnemonic = 'tower always inflict afraid ill common butter harbor fly high cream trade';

    const train_keyring = new Keyring({ type: "sr25519" });
    const TrainPair = train_keyring.addFromUri(mnemonic);
    return TrainPair;
}

async function transferTokens(OwnerPair, TrainPair){
    // transfer tokens from Owner to the Train
    // Connect to the local Substrate node
    const wsProvider = new WsProvider(WSS_URL);
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;

    console.log(`Sender Address: ${OwnerPair.address}`);
    console.log(`Recipient Address: ${TrainPair.address}`);

    return new Promise(async (resolve, reject) => {
        try {

            // Check initial balances
            const senderBalance = await api.query.system.account(OwnerPair.address);
            const recipientBalance = await api.query.system.account(TrainPair.address);

            console.log(senderBalance.data.free);
            const format = await formatBalance(senderBalance.data.free);
            const format2 = await formatBalance(recipientBalance.data.free);
            
            console.log(format);
            console.log(format2);

            // current BN of '100000000000000000 'is the min amount to create a single peaq DID.
            const transferAmount = new BN('100000000'); // Adjust the amount as needed

            // Create a balance transfer transaction
            const transfer = api.tx.balances.transfer(TrainPair.address, transferAmount);

            // Sign and send the transaction
            const hash = await transfer.signAndSend(OwnerPair);
            console.log(`Transfer sent with hash: ${hash}`);

            // Wait for the transaction to be finalized
            await api.rpc.chain.subscribeFinalizedHeads(async (header) => {
                const blockHash = await api.rpc.chain.getBlockHash(header.number);
                const block = await api.rpc.chain.getBlock(blockHash);

                block.block.extrinsics.forEach(async (ex, index) => {
                    if (ex.isSigned && ex.signer.toString() === OwnerPair.address) {
                        console.log(`Transaction included in block ${header.number} with hash ${blockHash}`);

                        // Test ending balances
                        const senderBalance2 = await api.query.system.account(OwnerPair.address);
                        const recipientBalance2 = await api.query.system.account(TrainPair.address);

                        const format3 = await formatBalance(senderBalance2.data.free);
                        const format4 = await formatBalance(recipientBalance2.data.free);
                        
                        console.log(format3);
                        console.log(format4);

                        await api.disconnect();
                        resolve();
                    }
                });
            });
        }
        catch (error) {
            console.log(error);
            reject();
        }
    });
}

async function createDID(sdk) {
    // send funds from the Owner to the User so they can create DID
    try {
    const result = await sdk.did.create({name: 'train_1'});
    console.log(result);
    const result2 = await sdk.did.read({name: 'train_1'});
    console.log(result2);
    }
    catch (error) {
        console.log(error);
    }
}

async function main() {
    try {
        const OwnerPair = await createOwner();
        const TrainPair = await generateTrain();
        await transferTokens(OwnerPair, TrainPair); // train now has money to transact to create DID
       
        // connect to sdk
        const sdk = await createSdkInstance();
        await sdk.connect();
        await createDID(sdk);
        await sdk.disconnect();
    }
    catch {

    }
};

async function formatBalance(balance) {
    return balance.div(new BN(10).pow(new BN(8))).toString(); // Convert from smallest unit (Planck) to human-readable format (DOT)
}

async function createSdkInstance() {
    // mnemonic hard-coded for now, will self-generate to create keyring and then use this generated to pass here
    const mnemonic = "tower always inflict afraid ill common butter harbor fly high cream trade";
    try {
      const sdkInstance = await Sdk.createInstance({ 
        baseUrl: WSS_URL,
        seed: mnemonic
     });
      return sdkInstance;
    } catch (error) {
      console.error(`Failed to create SDK instance: ${error}`);
      throw error;
    }
  }

export {main}