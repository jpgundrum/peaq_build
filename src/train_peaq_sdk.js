// For an environment that supports ECMAScript modules (ESM)
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Sdk } from "@peaq-network/sdk";
import { create } from 'ipfs-http-client';  // deploy metadata to ipfs
import { cryptoWaitReady, blake2AsHex } from "@polkadot/util-crypto";
import Keyring from "@polkadot/keyring";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import dotenv from 'dotenv';

// replace with api to source train data
import fs from 'fs/promises'; // Using the promise-based version of the fs module
import path from 'path';
import { fileURLToPath } from 'url';
// obtain path for hard-coded train data (future -> api data source?)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '..', 'data', 'train_data.json');

// env vars
dotenv.config();
const OWNER_SEED = process.env.MNEMONIC;
const MACHINE_SEED = process.env.MACHINE_SEED;

// base urls to make peaq & ipfs network connections
const AGUNG_BASE_URL = "wss://wsspc1-qa.agung.peaq.network";
const IPFS_GATEWAY = ""; // TODO update

// TODO what should be stored off-chain? Currently have the json file, but may want to add DID's??
async function storeOffChain(train_data) {
  const ipfs = create({url: IPFS_GATEWAY});
  const added = await ipfs.add(train_data);
  const cid = added.cid.toString();
  return cid;
}

// creates new agung sdk instance based on the Contract Owner
async function createSdkInstance()  {
    if (!OWNER_SEED) throw new Error("OWNER_SEED is not defined in .env file");
    await cryptoWaitReady();
    const sdk = await Sdk.createInstance({
        baseUrl: AGUNG_BASE_URL,
        seed: OWNER_SEED,
    });
    return sdk;
}

async function peaqDataStorage(email, cid) {
    // Establish a new ApiPromise instance using the peaq agung-net connection URL
    //
    // TODO
    //
    //

    const wsp = new WsProvider(AGUNG_BASE_URL);
    const api = await (await ApiPromise.create({ provider: wsp })).isReady;

    let itemType = cid;

    const payload = email; // serialize the email?? If not, then what?
    const payloadHex = u8aToHex(JSON.stringify(payload));  // Serialize payload into hex format for storage
    await fundTransactionFees(signerAddress);

    var tx = await api.tx.peaqStorage
        .addItem(itemType, payloadHex).signAndSend(kp, (result) => {
            console.log(`Transaction result: ${JSON.stringify(result)}\n\n`);
            tx();
    });

}

// Helper function to wrap the signAndSend in a Promise
function sendTransaction(api, OwnerPair, name) {
  return new Promise((resolve, reject) => {

    api.tx.peaqDid.readAttribute(OwnerPair.address, name)

      .signAndSend(OwnerPair, ({ status, events }) => {

        if (status.isInBlock) {
          console.log(`Transaction included at blockHash ${status.asInBlock}`);
        } else if (status.isFinalized) {
          console.log(`Transaction finalized at blockHash ${status.asFinalized}`);

          if (events) {
            events.forEach(({ event: { data, method, section }, phase }) => {
              // console.log(`\t'${section}.${method}': ${JSON.stringify(data)}`);
              if (section === 'peaqDid' && method === 'AttributeRead') {
                resolve(data); // Resolve the Promise with the data
              }
            });
          } else {
            resolve(); // Resolve the Promise as there are no events
          }
        } else {
          console.log(`Transaction status: ${status.type}`);
        }
      }).catch((error) => {
        console.log(`Transaction failed: ${error.message}`);
        reject(error); // Reject the Promise if there's an error
      });
  });
}

async function createOwnerDID(sdk)  {
    // TODO read train data
    const jsonData = await readJsonData();
    const peaqIdMapping = {};


    // Create a keypair of the owner of the dApp, aka the city metro system administrator
    await cryptoWaitReady();                                   // when is this needed
    const owner_keyring = new Keyring({ type: "sr25519" });         // sr25519 key pair used to sign and verify transactions
    const OwnerPair = owner_keyring.addFromUri(OWNER_SEED);         

    // Create a keypair of the machine in the dApp, aka the wallet for each train
    await cryptoWaitReady();                                 
    const train_keyring = new Keyring({ type: "sr25519" });
    const TrainPair = train_keyring.addFromUri(MACHINE_SEED);         // key pair created using the particular trains's seed phrase (have secret list of all train seeds somewhere as the owner)



    const did_name = `did:peaq:${OwnerPair.address}`;
    const did_document = {
      "document":{
        "id":`did:peaq:${OwnerPair.address}`,
        "controller":`did:peaq:${OwnerPair.address}`,
        "verificationmethodsList":[
          {
            "id": "#pk1",
            "type": "Sr25519VerificationKey2020",
            "controller": `did:${OwnerPair.address}`,
            "publicKeyMultibase": `z${OwnerPair.address}` 
          }
        ],
        "owner_signature": "genesis",
        "servicesList":[
          {
            "id": "#device",
            "type": "device",
            "controller":`did:peaq:${OwnerPair.address}`,
            "devicePublicAddress": `${TrainPair.address}`,
            "depin_signature": "genesis",
          },
          {
            "id": "#metadata",
            "type": "ipfs_metadata",
            "serviceEndpoint": `ipfs/${IPFS_GATEWAY}`
          },
        ],
        "authenticationsList":[
          "#pk1"
        ]
    }
  }

  // obtain hash and add signature to chain
  const message = stringToU8a(did_document);
  const hashed_did = blake2AsHex(message);
  const signature = TrainPair.sign(hashed_did);
  const final_sign = u8aToHex(signature);

  // // create and verify using the sdk
  // const { hash } = await sdk.did.create({
  //   name: final_sign,
  // });
  // const data = await sdk.did.read({
  //   name: final_sign,
  // });
  // const isValid = TrainPair.verify(hashed_did, final_sign, TrainPair.publicKey);
  // console.log(isValid);

  // // create and verify using javascript pallets

  const wsp = new WsProvider(AGUNG_BASE_URL);
  const api = await (await ApiPromise.create({ provider: wsp })).isReady;

  const doc = stringToU8a(did_document);
  const name = "did_train";

  // treat data from train_data.json as off-chain storage


  // add attribute for the first time
  // var tx = await api.tx.peaqDid
  // .addAttribute(OwnerPair.address, name, message, null).signAndSend(OwnerPair, (result) => {
  //   console.log(`Transaction result: ${JSON.stringify(result)}\n\n`);
  //   tx();
  // });

 // update an existing attribute
  var tx = await api.tx.peaqDid
  .updateAttribute(OwnerPair.address, name, final, null).signAndSend(OwnerPair, (result) => {
    console.log(`Transaction result: ${JSON.stringify(result)}\n\n`);
  });
// How to use validFor (block number) instead of null?

  // try {
  //   const attributeReadData = await sendTransaction(api, OwnerPair, name);
  //   wsp.disconnect();
  //   api.disconnect();
  //   // // console.log(attributeReadData);
  //   // console.log('Attribute Name:', u8aToString(attributeReadData[0].get('name')));
  //   // console.log('Attribute Value:', u8aToString(attributeReadData[0].get('value')));


    // prove that the TrainPair created the did
    // const obtained_signature = u8aToHex(attributeReadData[0].get('value'));

    // const isValid = TrainPair.verify(hashed_did, obtained_signature, TrainPair.publicKey);
    // console.log(isValid);

  // } catch (error) {
  //   console.error('Error during transaction:', error);
  // }


 // update storage
 var tx = await api.tx.peaqStorage
  .addItem(OwnerPair.address, name, final, null).signAndSend(OwnerPair, (result) => {
    console.log(`Transaction result: ${JSON.stringify(result)}\n\n`);
  });






    // OwnerPair.publicKey -> is the encoded UintArray of the public key
    // keyring.encodeAddress(pair.publicKey, 42); -> used to encode the address

    // TODO: Do I need the infor below??
    // // Creating key pair for the subject of the DID from seed
    // const DIDSubjectPair = keyring.addFromUri(DID_SUBJECT_SEED);
    // // Creating key pair for the DePin from seed
    // const DePinPair = keyring.addFromUri(DEPIN_SEED);
    
    // // Address derived from DIDSubjectPair
    // const DIDAddress = DIDSubjectPair.address;

    // // Signer Address derived from OwnerPair
    // const signerAddress = OwnerPair.address;

    
    // // create a loop that maps train id's to newly create peaq id's
    // for (let i = 0; i < jsonData.trains.length; i++){
    //     // generate a new seed for the particular train
    //     const machineSeed = mnemonicGenerate();


    //     // obtain email from data source
    //     const email = jsonData.trains[i].admin;
    //     const postdata = { email: email,  did_address: DIDAddress };
    //     const emailSignature = await createEmailSignature(postdata); // Creating email  signature

    //     // Generating signature using DePinSeed and DIDSubjectPair's address as data
    //     const signature = u8aToHex(DePinPair.sign(stringToU8a(DIDAddress)));

    //     // funding the transaction fees before submitting  the blockchain transaction
    //     await fundTransactionFees(signerAddress);

    //     try {
    //         const { hash } = await sdkInstance.did.create(
    //           {
    //             name: DID_NAME,
    //             address: DIDAddress,
    //             customDocumentFields: {
    //               services: [
    //                 {
    //                   id: "#emailSignature",
    //                   type: "emailSignature",
    //                   data: emailSignature,
    //                 },
    //               ],
    //               signature: {
    //                 type: "ED25519VERIFICATIONKEY2020",
    //                 hash: signature,
    //                 issuer: DePinPair.address, // The issuer is DePin
    //               },
    //             },
    //           },
    //           handleCreateDidResult // Passing callback function
    //         );
    //       } catch (error) {
    //         console.error("DID Creation Error:", error);
    //       }

    //     const didString = "did:peaq:" + toHexString(hash);
    //     peaqIdMapping[jsonData.trains[i].id] = didString;

    //     const cid = await storeOffChain(jsonData.trains[i]);
    //     await peaqDataStorage(email, cid);
    // }
    // console.log(peaqIdMapping);

    // IN GOOGLE DOC, but I'm not sure what it is used for
    // deviceSeed = mnemonicGenerate();
    // // Initialize a Keyring for signature and address generation
    // const kr = new Keyring({ type: 'sr25519', ss58Format: 42 });
    // let kp = kr.addFromMnemonic(deviceSeed);
    // let address = kp.address;
    
    return;
}
/**
 * creates and verifies a metro system
 * 
 * (add transfer capabilities for tokens and tickets given to customers and verify (based on their wallet) they can be on the system)
 */
async function main() {
    // initialize sdk instance based on 
    const sdk = await createSdkInstance();
    await sdk.connect();
    console.log("hellow worl");


    // think of special first step to initialize items
    try {
        // create owner did
        await createOwnerDID(sdk);

        // create known machine ids (when does ipfs cid come into play? how to add more trains in time?)
        // mock create in ipfs
        let cid = await createTrainDID();


        // should be a loop constantly checking data signatures. If one isn't verified log as error.
        let verified = true;

        while(verified) {
          // wait for data to be added to ipfs

          // read fake train data from json (would be coming from machines themselves)
          // mock read in ipfs from json created based on previous hash
          const trainData = await readJsonData(cid);


          // add hash of train data to peaq storage
          const signature = await storeDataHash(trainData); // build based on cid or entire object

          // read storage to get hash and verify data is coming from the known train based on the cid
          verified = await verifySignature(signature);

          // if true create new cid based on that signature and post to ipfs
          cid = await updateTrainDID(signature);
        }
        // should continue to verify indefinitely
        
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
// export {main}



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



//*******IDEAS *********/
 /**
  *  double verification with Owner and TrainId?? -> how much would this slow down?
  *     - Or owner pair should sign maybe every 10 Train Signatures read last batch train signature and one have to verify the OwnerPair once?
  *       -  Have a genesis block and append all subsequent signatures to form chain of verification, encapsulated by Owner signatures every 10 block train transactions
  *       - verify all 10 depin signatures to so see if hash matches last recorded -> We read the did from the database, only verify every 10 ???
  * 
  */


    // append signature based on last read from the train
    // 1. Create a transaction with no connected signature
    //      - Write to blockchain a genesis block signature with hashed owner's pair verifiable did document
    // 2. Read genesis signature
    //      - Read the genesis signature based what is write to the owner's public key and item_name 
    //      - Build next hash based on previous signature and current did document
    // 3. Continue to verify in this way (maybe batch requests?)
    // 
    // first did don't have service list, next add the depin to the service list and use both signatures
    // add item for genesis, update for the rest