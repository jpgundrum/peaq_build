// For an environment that supports ECMAScript modules (ESM)

import { mnemonicGenerate, cryptoWaitReady } from "@polkadot/util-crypto";
import { Sdk } from "@peaq-network/sdk";
import dotenv from 'dotenv';

// replace with api to source train data
import fs from 'fs/promises'; // Using the promise-based version of the fs module
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const MNEMONIC = process.env.MNEMONIC;
const OWNER = process.env.OWNER;
const agung_base_url = "wss://wsspc1-qa.agung.peaq.network";

// obtain path for hard-coded train data (future -> api data source?)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '..', 'data', 'train_data.json');

// used to convert Uint8Array to reabable string
function toHexString(bytes) {
    return bytes.reduce(function(str, byte) {
        return str + byte.toString(16).padStart(2, '0');
    }, '');
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

// creates new agung sdk instance
async function createSdkInstance(){
    if (!MNEMONIC) throw new Error("MNEMONIC is not defined in .env file");
    await cryptoWaitReady();
    const sdk = await Sdk.createInstance({
        baseUrl: agung_base_url,
        seed: MNEMONIC, // is there a way to generate a new mnemoic with tokens allocated, or should it be from a trusted account?
    });
    return sdk;
}

// creates new decentralized ID based on the name passed
async function createDID(sdk, name) {
    const { hash } = await sdk.did.create({
        name: name,
    });
    const didString = "did:peaq:" + toHexString(hash);
    return didString;
}

async function main() {
    // read train data
    const jsonData = await readJsonData();
    const peaqIdMapping = {};


    // initialize sdk instance based on 
    const sdk = await createSdkInstance();
    await sdk.connect();

   try {
        // create a loop that maps train id's to newly create peaq id's
        for (let i = 0; i < jsonData.trains.length; i++){
            const decentralizedID = await createDID(sdk, jsonData.trains[i].id);
            peaqIdMapping[jsonData.trains[i].id] = decentralizedID;
        }
        console.log(peaqIdMapping);

        // TODO use a proper encryption technique for the purposes -> ask Iredia/Jona

    }
    catch (error) {
        console.error(error);
    } finally {
        await sdk.disconnect();
    }

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