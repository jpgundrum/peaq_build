// basic peaq integration on their AGUNG testnet based on docs:
// https://docs.peaq.network/docs/build/getting-started/

import axios from "axios";
import { ApiPromise, WsProvider } from '@polkadot/api';
import { hexToU8a, u8aToHex, stringToU8a, stringToHex, u8aToString } from "@polkadot/util";
import { mnemonicGenerate, cryptoWaitReady, decodeAddress, blake2AsHex, encodeAddress } from "@polkadot/util-crypto";
import { Sdk } from "@peaq-network/sdk";
import { defaultOptions } from '@peaq-network/types';
import Keyring from "@polkadot/keyring";
import dotenv from 'dotenv';

dotenv.config();
const MNEMONIC = process.env.MNEMONIC;
const OWNER = process.env.OWNER;

const AGUNG_BASE_URL = "wss://wsspc1-qa.agung.peaq.network";


// to generate a random mnemonic... however it lacks funding
// const generateMnemonicSeed = async () => {
//     return mnemonicGenerate();
//   };

/// TODO ask -> which is better to use arrow or normal declaration functions
const createSdkInstance = async () => {
    try {
      const sdkInstance = await Sdk.createInstance({ 
        baseUrl: AGUNG_BASE_URL,
        seed: MNEMONIC
     });
      return sdkInstance;
    } catch (error) {
      console.error(`Failed to create SDK instance: ${error}`);
      throw error;
    }
  };

// creates new agung sdk instance
// async function createSdkInstance(){
//     if (!MNEMONIC) throw new Error("MNEMONIC is not defined in .env file");
//     await cryptoWaitReady();
//     const sdk = await Sdk.createInstance({
//         baseUrl: AGUNG_BASE_URL,
//         seed: MNEMONIC,
//     });
//     return sdk;
// }

async function generateKeyPair() {
    const keyring = new Keyring({ type: "sr25519" });
   // const machineSeed = mnemonicGenerate(); // update to machine?? need funds.
    const ownerPair = keyring.addFromUri(MNEMONIC); // for now using my supplied agung wallet
    return ownerPair;
}

async function generateAndSignData(ownerPair) {
    const dataHex = "test-data";
    const signature = ownerPair.sign(dataHex);
    const payload = {
        data: dataHex,
        signature: signature,
    };
    
    const payloadHex = "payload";
    return payloadHex;
}

async function dataStorage(ownerPair) {
    // Establish a new ApiPromise instance using the peaq mainnet connection URL
    const wsp = new WsProvider(AGUNG_BASE_URL);
    const api = await (await ApiPromise.create({ provider: wsp })).isReady;
    
    const payloadHex = await generateAndSignData(ownerPair);

    // check to make sure parameter lengths are proper sizes
    if (ownerPair.address.length > 64) {
        throw new Error("Item type exceeds maximum length of 64 bytes.");
    }
    if (payloadHex.length > 256) {
        throw new Error("Item exceeds maximum length of 256 bytes.");
    }

    // // TODO when should below code be used?
    // let response = await axios.post(`${AGUNG_BASE_URL}/v1/data/store`, {
    //     item_key: itemType,
    //     email: email
    // });

    // First time use of the ownerPair.address must use .addItem; if it has been used before you must use .updateItem or else it will fail
    // var tx = await api.tx.peaqStorage
    // .addItem(ownerPair.address, payloadHex).signAndSend(ownerPair, (result) => {
    //     console.log(`Transaction result: ${JSON.stringify(result)}\n\n`);
    //     tx();
    // });

    const toBytes = u8aToHex(ownerPair.address);

    const toyBytesPayload = stringToHex(payloadHex);
    
    var tx = await api.tx.peaqStorage
    .updateItem(toBytes, payloadHex).signAndSend(ownerPair, (result) => {
        console.log(`Transaction result: ${JSON.stringify(result)}\n\n`);
        tx();
    });

    api.disconnect();
    wsp.disconnect();
}

async function verifyDataStorage(ownerPair) {
    const wsp = new WsProvider(AGUNG_BASE_URL);
    const api = await (await ApiPromise.create({ provider: wsp })).isReady;

   // console.log(ownerPair.address);

    const decodeAddressValue = decodeAddress(ownerPair.address, false, 42);
    const hashedKey = blake2AsHex(decodeAddressValue, 256);

    const val = await api.query.peaqStorage.itemStore(hashedKey);
    console.log("our user value", val);

    // var tx = await api.tx.peaqStorage
    // .getItem(ownerPair.address).signAndSend(ownerPair, (result) => {
    //     console.log(`Transaction result: ${JSON.stringify(result)}\n\n`);x
    //     tx();
    // });

    api.disconnect();
    wsp.disconnect();
}

// creates new decentralized ID based on the name passed
async function createDID(sdk, ownerPair) {
    // TODO how to chnage the document fields after creating from the readDID function
    const { hash } = await sdk.did.create({
        name: "my-did-name-2",
        document: {
            id:`did:peaq:${ownerPair.address}`,
            controller:`did:peaq:${ownerPair.address}`,
            verificationmethodsList:[
               {
                  id:"265dee4e-f915-43e4-9e22-5346c12fe9ae",
                  type:0,
                  controller: `did:peaq:${ownerPair.address}`,
                  publickeymultibase:"z5Df42mkztLtkksgQuLy4YV6hmhzdjYvDknoxHv1QBkaY12Pg"
               }
            ],
            servicesList:[
               
            ],
            authenticationsList:[
               "265dee4e-f915-43e4-9e22-5346c12fe9ae"
            ]
         }
    });
    return hash;
}

// reads the previously created DID name to retrieve information linked
async function readDID(sdk, ownerPair) {
   // DEBUGGING NOTES:
   // Must have brackets around name field when reading... brackets are omitted when looking at peaq docs
   const name = `did:peaq:${ownerPair.address}`;
   const name2 = "my-did-name-2";
    const did = await sdk.did.read({
        name: name2
    });
    return did;
}

// creates role for the address that is linked to this sdk instance
async function createRole(sdk, roleName) {
    const { roleId: createdRoleId } = await sdk.rbac.createRole({
        roleName: roleName,
      });
    return createdRoleId;
}

// fetches role information for the roleId passed
async function fetchRole(sdk, roleId, OWNER) {
    if (!OWNER) throw new Error("OWNER is not defined in .env file");
    const role = await sdk.rbac.fetchRole({
        owner: OWNER,
        roleId: roleId,
      });
    return role;
}

async function createPermission(sdk, permName) {
    const createdPermissionId = await sdk.rbac.createPermission({
        permissionName: permName,
      });
    return createdPermissionId;
}

async function disablePermission(sdk, permId) {
    const message = await sdk.rbac.disablePermission({
        permissionId: permId
    });
    return message;
}

async function fetchPermission(sdk, permId, OWNER) {
    if (!OWNER) throw new Error("OWNER is not defined in .env file");
    const permission = await sdk.rbac.fetchPermission({
        owner: OWNER,
        permissionId: permId,
    });

    return permission;
}

async function main() {
    const sdk = await createSdkInstance();
    await sdk.connect();
    const customFields = {
        services: [
            {
                id: 'Machine-1',
                type: 'Service-Endpoint',
                serviceEndpoint: 'http://localhost:8080/ipfs/',
                data: 'test2'
            }
        ]
    };

    const did_hash = await sdk.did.create({
        name: "JG-test-123457",
    });
    const read = await sdk.did.read({
        name: "JG-test-12345"
    });
   console.log(read);
   await sdk.disconnect();
}

// exports used to run main from index.js and execute the tests in the test_sdk file
export {main, createDID, readDID, createRole, fetchRole, createPermission, fetchPermission, disablePermission};