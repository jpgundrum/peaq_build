// For an environment that supports ECMAScript modules (ESM)
import { ApiPromise, WsProvider } from '@polkadot/api';
import { create } from 'ipfs-http-client';  // deploy metadata to ipfs
import { CID }  from 'multiformats/cid';
import { base58btc } from  'multiformats/bases/base58';

import { cryptoWaitReady, blake2AsHex, xxhashAsHex, blake2AsU8a, signatureVerify } from "@polkadot/util-crypto";
import { Keyring, decodeAddress } from "@polkadot/keyring";
import { hexToString, hexToU8a, stringToU8a, u8aToHex, u8aConcat, hexStripPrefix, u8aToU8a, stringToHex } from "@polkadot/util";
import dotenv from 'dotenv';

// replace with api to source train data
import fs from 'fs/promises'; // Using the promise-based version of the fs module
import path from 'path';
import { fileURLToPath } from 'url';

// obtain path for hard-coded train data (future -> api data source.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = path.join(__dirname, '..', 'data', 'train_data.json');

// Connect to the local IPFS node or an IPFS gateway
const ipfs = create({ url: 'http://localhost:5001' });

// env vars
dotenv.config();
const OWNER_SEED = process.env.MNEMONIC;
const MACHINE_SEED = process.env.MNEMONIC; // replace with machine see once I get my seed phrase from madison

// base urls to make peaq & ipfs network connections
const AGUNG_BASE_URL = "wss://wsspc1-qa.agung.peaq.network";
const IPFS_GATEWAY = ""; // TODO update
const DID_DOC_PATH = 'data/external_did_store.json';

// TODO what should be stored off-chain? Currently have the json file, but may want to add DID's??
async function ipfsStorage(train_data) {
  const ipfs = create({url: IPFS_GATEWAY});
  const added = await ipfs.add(train_data);
  const cid = added.cid.toString();
  return cid;
}

// Helper function to wrap the signAndSend in a Promise
function sendReadTransaction(api, method, ownerPub, name, TestPair) {
  if (method == "readAttribute") {
    return new Promise((resolve, reject) => {
      api.tx.peaqDid.readAttribute(ownerPub, name).signAndSend(TestPair, ({ status, events }) => {
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
              resolve();
            }
          } else {
            console.log(`Transaction status: ${status.type}`);
          }
        }).catch((error) => {
          console.log(`Transaction failed: ${error.message}`);
          reject(error);
        });
    });
  }
}

function sendWriteTransaction(api, method, OwnerPair, cid, did, signature) {
  if (method == "updateAttribute") {
    return new Promise((resolve, reject) => {
      api.tx.peaqDid.updateAttribute(OwnerPair.address, did, cid, null).signAndSend(OwnerPair, ({ status, events }) => {

        // group into callable method
            if (status.isFinalized) {
            console.log(`Transaction finalized at blockHash ${status.asFinalized}`);
              resolve(); // Resolve the Promise as there are no events
            } else {
            console.log(`Transaction status: ${status.type}`);
          }
        }).catch((error) => {
          console.log(`Transaction failed: ${error.message}`);
          reject(error); // Reject the Promise if there's an error
        });


    });

  } else if (method == "updateItem") {
      return new Promise((resolve, reject) => {
        api.tx.peaqStorage.addItem(cid, signature).signAndSend(OwnerPair, ({ status, events }) => {
              if (status.isFinalized) {
              console.log(`Transaction finalized at blockHash ${status.asFinalized}`);
                resolve(); // Resolve the Promise as there are no events
              } else {
              console.log(`Transaction status: ${status.type}`);
            }
          }).catch((error) => {
            console.log(`Transaction failed: ${error.message}`);
            reject(error); // Reject the Promise if there's an error
          });
      });
    }
}

async function updateDidStorageSr25519(OwnerPair, hashed_did) {
  // record the did_document to storage for the first time with the generated hash of the initial did_document
  const did_document = []
  did_document.push({
    "document":{
      "id":`did:peaq:${OwnerPair.address}`,
      "controller":`did:peaq:${OwnerPair.address}`,
      "verificationMethod":[
        {
          "id": "#pk1",
          "type": "Sr25519VerificationKey2020",
          "controller": `did:peaq:${OwnerPair.address}`,
        }
      ],
      "signature": {
        "type": "Sr25519VerificationKey2020",
        "issuer": `did:peaq:${OwnerPair.address}`,
        "hash": `${hashed_did}`
      },
    }
  })
  return did_document;
}


/**
 * Use off-chain storage to store all did_documents
 * 
 * 1. create id & controller did_document to generate first hash
 * 2. store hash in did_document off-chain
 * 3. send signature to store on-chain with cid as key
 * 4. update off-chain did_document to include hash to verify that the peaqStorage signature is valid
 */
async function createOwnerDID() {
  // Create a keypair of the owner of the dApp, aka the city metro system administrator based on their seed
  await cryptoWaitReady();                                   // when is this needed??
  const owner_keyring = new Keyring({ type: "sr25519" }); 
  const OwnerPair = owner_keyring.addFromUri(OWNER_SEED);

  // Create initial did_document based on the Owner address
  const did = `did:peaq:${OwnerPair.address}`;
  let did_document = []
  did_document.push({
    "document":{
      "id":`${did}`,
      "controller":`${did}`,
    }
  })


  // hash cid and update did_document off-chain to include this hash
  const did_bytes = stringToU8a(JSON.stringify(did_document));
  const hashed_did = blake2AsHex(did_bytes);    // hash the cid
  did_document = await updateDidStorageSr25519(OwnerPair, hashed_did); // at hash at that cid
  
  // sign hashed_cid using Owner's private key
  const signed = OwnerPair.sign(hashed_did);  // issuer signs hash
  const signature = u8aToHex(signed);         // ready for on-chain storage

  // store did_document off-chain and get a cid back
  const { cid } = await ipfs.add(JSON.stringify(did_document));
  let cidString = cid.toString();

  // create providers to connect to agung
  const wsp = new WsProvider(AGUNG_BASE_URL);
  const api = await (await ApiPromise.create({ provider: wsp })).isReady;

  // ***TODO***
  // - update so the did_document hash's is stored on-chain
  // - create mapping for did_document hash to stored cid to read from peaqStorage


  // Store owner's cid on-chain using peaq.addAttribute(did: cid)
 await sendWriteTransaction(api, "updateAttribute", OwnerPair, hashed_did, did, null);

  
  // Store owner's signature of cid on-chain using peaq.peaqStorage(cid: signature)
 await sendWriteTransaction(api, "updateItem", OwnerPair, cidString, null, signature);

  wsp.disconnect();
  api.disconnect();
  }

async function verifyOwnerDID() {
  // create providers to connect to agung
  const wsp = new WsProvider(AGUNG_BASE_URL);
  const api = await (await ApiPromise.create({ provider: wsp })).isReady;

  // sign transaction using your personal keypair
  const test_keyring = new Keyring({ type: "sr25519" }); 
  const TestPair = test_keyring.addFromUri(MACHINE_SEED);

  // HARD-CODED FOR TESTING: get owner public key off-chain storage? -> how to get
  const owner_public = "5Df42mkztLtkksgQuLy4YV6hmhzdjYvDknoxHv1QBkaY12Pg"; // need to change back to make sure it uses the correct owner public key
  const did = "did:peaq:5Df42mkztLtkksgQuLy4YV6hmhzdjYvDknoxHv1QBkaY12Pg";
  var hashed_did = "";
  var cid = "QmXTV56jaJ6B8EXVRnEDYxuy52RbZjgyXgfFKijy4mJp9z";


  // readAttribute(did) from known public key to get cid
  try {

    // **TODO** how can I read the owner's public key? Will this be provided somehow?
    const attributeReadData = await sendReadTransaction(api, "readAttribute", owner_public, did, TestPair);

    // read did_document hash used in validation, can also get the owner

    ////// MAYBE REMOVE COMMENT: read cid from the did readAttribute function to get signature from peaq storage
    hashed_did = u8aToHex(attributeReadData[0].get('value'));

  } catch (error) {
    console.error('Error during transaction:', error);
  }

  // // read mapping from obtained hash to get the cid
  //   for await (const chunk of ipfs.cat(cid)) {
  //     retrievedData.push(chunk);
  // }

  // // Convert retrieved data to string
  // const result = Buffer.concat(retrievedData).toString();


  // generate storage key
  const storageKeyByteArray = [];
  const decodedAddress = decodeAddress(owner_public, false, 42);
  storageKeyByteArray.push(decodedAddress);

  const hashItemType = u8aToU8a(cid);
  storageKeyByteArray.push(hashItemType);

  const key = u8aConcat(...storageKeyByteArray);

  const storageKey = blake2AsHex(key, 256);

  const val = await api.query.peaqStorage.itemStore(storageKey);

  // convert u8a to hex to obtain singature
  var signature = u8aToHex(val);
  console.log(signature);

  // verify hash and signature
  var verifyResult = signatureVerify(hashed_did, signature, owner_public);
  console.log("\nSignature Verify Result: ", verifyResult.isValid, "\n");

  wsp.disconnect();
  api.disconnect();
  }
/**
 * creates and verifies a metro system
 * 
 * Have 2nd process be reading the ipfs server every x time
 * (add transfer capabilities for tokens and tickets given to customers and verify (based on their wallet) they can be on the system)
 * mock faulty data to ensure it isn't validated
 */
async function main() {
  try {
   //await createOwnerDID();     // creates a signature on-chain for owner's did_document that can be validated
   await verifyOwnerDID();     // verifies signature from peaqStorage with cid read from peaqDid based on public address. Obtain hash in off-chain storage of did_document based on cid as well
  }
  catch (error) {
      console.error(error);
  }



      // TODO below ...

        // create known machine ids (when does ipfs cid come into play? -> cid is based on did /// how to add more trains in time? -> owner has privileges)
        // mock create in ipfs thru json train data


        // when creating machine ids use did:peaq generated by keyring for the trains to write to train json (mock ipfs) as cid
        // Have these trains signed by the owner 
        // - based on hashing owner's
        //
        // - create a key_ring to derive a public address that will be used for did/cid -> train identifier
        //    - map keyring object to the associated hash
        // - add a signature from the did:peaq(cid) just created to validate when we read data
        // - upload cid to the train that has that signature that was built from it (cid is train public key)
        //
        // Return back a list of hashes that will be used to validate
        // const keyring_hash = {}
        // keyring_hash = await createTrainDID();


        // // should be a loop constantly checking data signatures. If one isn't verified log as error.
        // let verified = true;

        // while(verified) {
        //   // wait for data to be added to ipfs

        //   // read fake train data from json (would be coming from machines themselves)
        //   // mock read in ipfs from json created based on previous hash
        //   //
        //   // return back cid and their signatures to validate against the train and the 
        //   const trainCidData = await readJTrainData();

        //   // create a proof validating the data came from where it was suppose to
        //   // - add cid based on a signed hash
        //   // - read cid back and verify the read signature matches the known Train.publicAddress
        //   await validateTrainData(hashes);


        //   // add hash of train data to peaq storage
        //   const signature = await storeDataHash(trainData); // build based on cid or entire object

        //   // read storage to get hash and verify data is coming from the known train based on the cid
        //   verified = await verifySignature(signature);

        //   // if true create new cid based on that signature and post to ipfs
        //   cid = await updateTrainDID(signature);
        // }
        // should continue to verify indefinitely
        
}

// ipfs off-chain data store
async function ipfsTest() {
  try {
    // Example data to store
    const data = 'Hello, IPFS from JavaScript!';

    // Add data to IPFS
    const { cid } = await ipfs.add(data);

    // Log the CID
    console.log('Stored data CID:', cid.toString());


    // get data from did_document
    const retrievedData = [];
    for await (const chunk of ipfs.cat(cid)) {
        retrievedData.push(chunk);
    }
  
    // Convert retrieved data to string
    const result = JSON.parse(Buffer.concat(retrievedData).toString());
    console.log('Retrieved data:', result[0].document.verificationMethod);

    console.log('Retrieved data:', result);
} catch (error) {
    console.error('Error:', error);
}
}


// off-chain operations
async function readHashOffChain(cid) {
  const did_document = await fs.readFile(DID_DOC_PATH, 'utf8');
  const did_json = JSON.parse(did_document)

  for (let i = 0; i < did_json.length; i++) {
    if (did_json[i][cid]) {
      const hash = did_json[i][cid][0].document.signature.prev_hash;
      return hash;
    }
  }

  return;
}

async function appendDataOffChain(cid, did_document) {
  const data = await fs.readFile(DID_DOC_PATH, 'utf8');
  const did_documents = JSON.parse(data);

  // Check if the hash key exists and update the document
  let found = false;
  for (let i = 0; i < did_documents.length; i++) {
    if (did_documents[i][cid]) {
      did_documents[i][cid] = did_document;
      found = true;
      break;
    }
  }

    if (!found) {
      console.log('Hash key not found, no data updated.');
      return;
    }
    await fs.writeFile(DID_DOC_PATH, JSON.stringify(did_documents, null, 2), 'utf8');

}

async function storeDidOffChain(did_document) {
  // Serialize the object to a JSON string
  const cid = await createCID(did_document);
  
  // add cid to did_document
  const new_doc = []
  new_doc.push({
    [cid]: {
      document: did_document[0].document
    }
  });

  const jsonData = JSON.stringify(new_doc, null, 2); // The '2' adds indentation for better readability
  await fs.writeFile(DID_DOC_PATH, jsonData, 'utf8');
  
  return cid
}

async function  createCID(inputString) {
  // Encode the input string as UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(inputString));

  // Hash the data with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert the buffer to hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');

  return hashHex;
}


export {main}




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




    // const did_document = {
    //   "document":{
    //     "id":`did:peaq:${OwnerPair.address}`,
    //     "controller":`did:peaq:${OwnerPair.address}`,
    //     "verificationMethod":[
    //       {
    //         "id": "#pk1",
    //         "type": "Sr25519VerificationKey2020",
    //         "controller": `did:peaq:${OwnerPair.address}`,
    //       }
    //     ],
    //     "signature": {
    //       "type:": "Sr25519VerificationKey2020",
    //       "issuer": `did:peaq:${OwnerPair.address}`,
    //       "hash": `${signature}`
    //     },
    //     "service":[
    //       {
    //         "id": "#device",
    //         "type": "device",
    //         "controller":`did:peaq:${OwnerPair.address}`,
    //         "devicePublicAddress": `did:peaq:${TrainPair.address}`,
    //         "serviceEndpoint": "train_data_retrieval_endpoint",
    //       },
    //       {
    //         "id": "#metadata",
    //         "type": "ipfs_metadata",
    //         "serviceEndpoint": `ipfs/${IPFS_GATEWAY}`
    //       },
    //     ],
    //     "authentication":[
    //       "#pk1"
    //     ]
    //   }
    // }