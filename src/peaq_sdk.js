// basic peaq integration on their AGUNG testnet based on docs:
// https://docs.peaq.network/docs/build/getting-started/

import axios from "axios";
import { ApiPromise, WsProvider } from '@polkadot/api';
import { hexToU8a, u8aToHex, stringToU8a, stringToHex } from "@polkadot/util";
import { mnemonicGenerate, cryptoWaitReady } from "@polkadot/util-crypto";
import { Sdk } from "@peaq-network/sdk";
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

// used to convert Uint8Array to reabable string
function toHexString(bytes) {
    return bytes.reduce(function(str, byte) {
        return str + byte.toString(16).padStart(2, '0');
    }, '');
}

// creates new agung sdk instance
async function createSdkInstance(){
    if (!MNEMONIC) throw new Error("MNEMONIC is not defined in .env file");
    await cryptoWaitReady();
    const sdk = await Sdk.createInstance({
        baseUrl: AGUNG_BASE_URL,
        seed: MNEMONIC,
    });
    return sdk;
}

async function generateKeyPair() {
    const keyring = new Keyring({ type: "sr25519" });
    const machineSeed = mnemonicGenerate(); // update to machine?? need funds.
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
    
    const payloadHex = u8aToHex(payload);
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

    var tx = await api.tx.peaqStorage
    .addItem(ownerPair.address, payloadHex).signAndSend(ownerPair, (result) => {
        console.log(`Transaction result: ${JSON.stringify(result)}\n\n`);
        tx();
});
    wsp.disconnect();
}

// creates new decentralized ID based on the name passed
async function createDID(sdk, ownerPair) {
    // TODO how to chnage the document fields after creating from the readDID function
    const { hash } = await sdk.did.create({
        name: `did:peaq:${ownerPair.address}`});
    const didHash = toHexString(hash);
    return didHash;
}

// reads the previously created DID name to retrieve information linked
async function readDID(sdk, ownerPair) {
   // DEBUGGING NOTES:
   // Must have brackets around name field when reading... brackets are omitted when looking at peaq docs
   const name = `did:peaq:${ownerPair.address}`;
    const did = await sdk.did.read({
        name: name
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

    const name = 'myDID';
    const roleName = "myrole";
    const permName = 'myPermission';

    const ownerPair = await generateKeyPair();

    try {
        const didHash = await createDID(sdk, ownerPair);
        console.log(`\nDID hash: ${didHash}\n`);

        const didInfo = await readDID(sdk, ownerPair);
        console.log(`DID data: \n${JSON.stringify(didInfo)}\n`);

        await dataStorage(ownerPair);

        // const roleID = await createRole(sdk, roleName);
        // console.log(`Created role Id: ${roleID}\n`);

        // const role = await fetchRole(sdk, roleID, OWNER);
        // console.log(`Fetched role: ${JSON.stringify(role)}\n`);

        // const permId = await createPermission(sdk, permName);
        // console.log(`Created a permission with id: ${permId.permissionId}\n`);

        // const permission = await fetchPermission(sdk, permId.permissionId, OWNER);
        // console.log(`Permission for sdk owner: ${JSON.stringify(permission)}\n`);

        // const message = await disablePermission(sdk, permId.permissionId);
        // console.log(`Removed previously created permission with the message: ${JSON.stringify(message)}\n`);

        // const permission2 = await fetchPermission(sdk, permId.permissionId, OWNER);
        // console.log(`Permission for sdk owner: ${JSON.stringify(permission2)}\n`);

    }
    catch (error) {
        console.error(error);
    } finally {
        await sdk.disconnect();
    }
}

// exports used to run main from index.js and execute the tests in the test_sdk file
export {main, createDID, readDID, createRole, fetchRole, createPermission, fetchPermission, disablePermission};