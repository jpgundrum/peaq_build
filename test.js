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

// creates new agung sdk instance
const sdk = await Sdk.createInstance({
    baseUrl: agung_base_url,
    seed: MNEMONIC,
});

// used to convert Uint8Array to reabable string
const toHexString = bytes => 
    bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

// to generate a random mnemonic... however it lacks funding
// const generateMnemonicSeed = async () => {
//     return mnemonicGenerate();
//   };



// creates new decentralized ID based on the name passed
const createDID = async (name) => {
    const { hash } = await sdk.did.create({
        name,
    });
    return hash;
}

// reads the previously created DID name to retrieve information linked
const readDID = async (name) => {
   // DEBUGGING NOTES:
   // cannot have {} around did var, but must have brackets around name... confusing when looking at peaq docs
    const did = await sdk.did.read({name});
    return did;
}

// creates role for the address that is linked to this sdk instance
const createRole = async (roleName) => {
    const { roleId: createdRoleId } = await sdk.rbac.createRole({
        roleName,
      });
    return createdRoleId;
};

// fetches role information for the roleId passed
const fetchRole = async (roleId) => {
    const owner = OWNER;
    const role = await sdk.rbac.fetchRole({
        owner,
        roleId,
      });
    return role;
};


async function main() {
    await sdk.connect();

    const name = 'myDID';
    const roleName = "myrole";

    // create new Decentralized Id
    await createDID(name)
    .then((bytesHash) => {
        const didJson = {
            hash: "0x" + toHexString(bytesHash)
        };
        console.log(`\nDID address: ${didJson.hash}\n`);
    })
    .catch((error) => {
        console.error(`Error creating DID address: ${error}`);
    });

    // read the previously created Decentralized Id
    await readDID(name)
    .then((did) => {
        console.log(`DID data: \n${JSON.stringify(did)}\n`);
    })
    .catch((error) => {
        console.error(`Error reading DID data: ${error}`);
    });

    let rID;
    // create a new role for the address at this sdk instance
    await createRole(roleName)
     .then((roleId) => {
        rID = roleId;
         console.log(`Created role Id: ${roleId}\n`);
     })
     .catch((error) => {
         console.error(`Error creating new role: ${error}`);
     });

     // fetch role information preivously created
     await fetchRole(rID)
     .then((role) => {
         console.log(`Fetched role: ${JSON.stringify(role)}\n`);
     })
     .catch((error) => {
         console.error(`Error fetching role: ${error}`);
     });

    // disconnect from sdk once your are completed
    await sdk.disconnect();
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });