// basic peaq integration on their AGUNG testnet based on docs:
// https://docs.peaq.network/docs/build/getting-started/
// **TODO** make it compatible with typescript and add further SDK functionality
import { mnemonicGenerate, cryptoWaitReady } from "@polkadot/util-crypto";
import { Sdk } from "@peaq-network/sdk";
import dotenv from 'dotenv';

dotenv.config();
const MNEMONIC = process.env.MNEMONIC;
const OWNER = process.env.OWNER;

const agung_base_url = "wss://wsspc1-qa.agung.peaq.network";


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
        baseUrl: agung_base_url,
        seed: MNEMONIC,
    });
    return sdk;
}

// creates new decentralized ID based on the name passed
async function createDID(sdk, name) {
    const { hash } = await sdk.did.create({
        name: name,
    });
    const didString = "0x" + toHexString(hash);
    return didString;
}

// reads the previously created DID name to retrieve information linked
async function readDID(sdk, name) {
   // DEBUGGING NOTES:
   // cannot have {} around did var, but must have brackets around name... confusing when looking at peaq docs
    const did = await sdk.did.read({name: name});
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

async function main() {
    const sdk = await createSdkInstance();
    await sdk.connect();

    const name = 'myDID';
    const roleName = "myrole";


    try {
        const decentralizedID = await createDID(sdk, name);
        console.log(`\nDID address: ${decentralizedID}\n`);

        const didInfo = await readDID(sdk, name);
        console.log(`DID data: \n${JSON.stringify(didInfo)}\n`);

        const roleID = await createRole(sdk, roleName);
        console.log(`Created role Id: ${roleID}\n`);

        const role = await fetchRole(sdk, roleID, OWNER);
        console.log(`Fetched role: ${JSON.stringify(role)}\n`);

    }
    catch (error) {
        console.error(error);
    } finally {
        await sdk.disconnect();
    }
}

// Checks if the module is thje main module being run
// Used to prevent unit tests from executing the code

// Application-specific code
// main().catch((error) => {
//     console.error(error);
//     process.exitCode = 1;
// });

export {main, createDID, readDID, createRole, fetchRole};