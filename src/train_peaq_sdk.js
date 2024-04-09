// For an environment that supports ECMAScript modules (ESM)

import axios from "axios";
import { Sdk } from "@peaq-network/sdk";
import { create } from 'ipfs-http-client';
import { mnemonicGenerate, cryptoWaitReady } from "@polkadot/util-crypto";
import Keyring from "@polkadot/keyring";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import dotenv from 'dotenv';

// replace with api to source train data
import fs from 'fs/promises'; // Using the promise-based version of the fs module
import path from 'path';
import { fileURLToPath } from 'url';

// env vars
dotenv.config();
const OWNER_SEED = process.env.MNEMONIC;
const DEPIN_SEED = "<DEPIN_SEED>"; // The seed phrase for DePIN, used for signing the DID
const DID_SUBJECT_SEED = "<DID_SUBJECT_SEED>"; // The seed phrase for the subject (Machine) of the DID
const PEAQ_SERVICE_URL  = "<PEAQ_SERVICE_URL>"; // URL to the peaq service will be provided later

// base urls to make peaq & ipfs network connections
const AGUNG_BASE_URL = "wss://wsspc1-qa.agung.peaq.network";
const IPFS_GATEWAY = "wss://wsspc1-qa.agung.peaq.network";

// obtain path for hard-coded train data (future -> api data source?)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '..', 'data', 'train_data.json');

// Function to create email signature
async function createEmailSignature (data)  {
    try {
      const response = await axios.post(`${PEAQ_SERVICE_URL}/v1/sign`, data);
      // Note: You may need to adjust the response handling based on the service's response structure
      return response.data.signature;
    } catch (error) {
      console.error("Error creating email signature", error);
      throw error;
    }
  }

// Callback function to handle the create DID result
const handleCreateDidResult = (result) => {
    const dispatchError = result.dispatchError;
    if (dispatchError?.isModule) {
      const decoded = result._api.registry.findMetaError(
        dispatchError.asModule
      );
      const { docs, name, section } = decoded;
      console.log(`${section}.${name}: ${docs.join(" ")}`);
    }
    console.log(`Hash from callback: ${result.status}`);
    console.log("Use this hash to check the DID on the network.");
};

// Function to fund transaction fees
const fundTransactionFees = async (walletAddress) => {
    try {
      const response = await axios.post(`${PEAQ_SERVICE_URL}/v1/pay-tx-fees`, {wallet: walletAddress});
  
      // Note: You may need to adjust the response handling based on the service's response structure
      return response.data.wallet;
    } catch (error) {
      console.error("Error funding transaction fees", error);
      throw error;
    }
  };

// creates new agung sdk instance
async function createSdkInstance()  {
    if (!MNEMONIC) throw new Error("MNEMONIC is not defined in .env file");
    await cryptoWaitReady();
    const sdk = await Sdk.createInstance({
        baseUrl: AGUNG_BASE_URL,
        seed: OWNER_SEED, // is there a way to generate a new mnemoic with tokens allocated, or should it be from a trusted account?
    });
    return sdk;
}

// TODO what should be stored off-chain? Currently have the json file, but may want to add DID's??
async function storeOffChain(train_data) {
    const ipfs = create({url: IPFS_GATEWAY});
    const added = await ipfs.add(train_data);
    const cid = added.cid.toString();
    return cid;
}

async function peaqDataStorage(email, cid) {
    // Establish a new ApiPromise instance using the peaq agung-net connection URL
    const wsp = new WsProvider(AGUNG_BASE_URL);
    const api = await (await ApiPromise.create({ provider: wsp })).isReady;

    let itemType = cid;
    let response = await axios.post(`${PEAQ_SERVICE_URL}/v1/data/store`, {
        item_key: itemType,
        email: email
    });

    const payload = email; // serialize the email?? If not, then what?
    const payloadHex = u8aToHex(JSON.stringify(payload));  // Serialize payload into hex format for storage
    await fundTransactionFees(signerAddress);

    var tx = await api.tx.peaqStorage
        .addItem(itemType, payloadHex).signAndSend(kp, (result) => {
            console.log(`Transaction result: ${JSON.stringify(result)}\n\n`);
            tx();
    });

}

async function createDID(sdk)  {
    // read train data
    const jsonData = await readJsonData();
    const peaqIdMapping = {};

    const keyring = new Keyring({ type: "sr25519" });
    // Creating key pair for the owner  of the subject  from seed
    const OwnerPair = keyring.addFromUri(OWNER_SEED);

    // TODO: Do I need the infor below??
    // // Creating key pair for the subject of the DID from seed
    // const DIDSubjectPair = keyring.addFromUri(DID_SUBJECT_SEED);
    // // Creating key pair for the DePin from seed
    // const DePinPair = keyring.addFromUri(DEPIN_SEED);
    
    // // Address derived from DIDSubjectPair
    // const DIDAddress = DIDSubjectPair.address;

    // // Signer Address derived from OwnerPair
    // const signerAddress = OwnerPair.address;

    
    // create a loop that maps train id's to newly create peaq id's
    for (let i = 0; i < jsonData.trains.length; i++){
        // generate a new seed for the particular train
        const machineSeed = mnemonicGenerate();


        // obtain email from data source
        const email = jsonData.trains[i].admin;
        const postdata = { email: email,  did_address: DIDAddress };
        const emailSignature = await createEmailSignature(postdata); // Creating email  signature

        // Generating signature using DePinSeed and DIDSubjectPair's address as data
        const signature = u8aToHex(DePinPair.sign(stringToU8a(DIDAddress)));

        // funding the transaction fees before submitting  the blockchain transaction
        await fundTransactionFees(signerAddress);

        try {
            const { hash } = await sdkInstance.did.create(
              {
                name: DID_NAME,
                address: DIDAddress,
                customDocumentFields: {
                  services: [
                    {
                      id: "#emailSignature",
                      type: "emailSignature",
                      data: emailSignature,
                    },
                  ],
                  signature: {
                    type: "ED25519VERIFICATIONKEY2020",
                    hash: signature,
                    issuer: DePinPair.address, // The issuer is DePin
                  },
                },
              },
              handleCreateDidResult // Passing callback function
            );
          } catch (error) {
            console.error("DID Creation Error:", error);
          }

        const didString = "did:peaq:" + toHexString(hash);
        peaqIdMapping[jsonData.trains[i].id] = didString;

        const cid = await storeOffChain(jsonData.trains[i]);
        await peaqDataStorage(email, cid);
    }
    console.log(peaqIdMapping);

    // IN GOOGLE DOC, but I'm not sure what it is used for
    // deviceSeed = mnemonicGenerate();
    // // Initialize a Keyring for signature and address generation
    // const kr = new Keyring({ type: 'sr25519', ss58Format: 42 });
    // let kp = kr.addFromMnemonic(deviceSeed);
    // let address = kp.address;
    
    return sdk;
}

async function main() {


    // initialize sdk instance based on 
    const sdk = await createSdkInstance();
    await sdk.connect();

    try {
        sdk = await createDID(sdk);
        generateAndSignData();
        // TODO use a proper encryption technique for the purposes -> ask Iredia/Jona

    }
    catch (error) {
        console.error(error);
    } finally {
        await sdk.disconnect();
    }

}

// Read and parse the JSON file
async function readJsonData() {
    try {
      const data = await fs.readFile(dataPath, 'utf8');
      const jsonData = JSON.parse(data);
      return jsonData
    } catch (err) {
      console.error("Error reading the file:", err);
    }
  }

  // used to convert Uint8Array to reabable string
function toHexString(bytes) {
    return bytes.reduce(function(str, byte) {
        return str + byte.toString(16).padStart(2, '0');
    }, '');
}


export {main}



// below is code for parrell execution... not sure which is better -> async operations in a loop (as implemented) or using Promise.all
// Promise.all may be better because the tasks don't depend on each other

// const didPromises = jsonData.trains.map(train => 
//     createDID(sdk, train.id).then(decentralizedID => {
//         peaqIdMapping[train.id] = decentralizedID;
//     })
// );

// // Wait for all promises to resolve
// await Promise.all(didPromises);

// // After all DIDs are created and mapped
// console.log(peaqIdMapping);