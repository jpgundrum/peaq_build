import { create } from 'ipfs-http-client';  // deploy metadata to ipfs
// Connect to the local IPFS node or an IPFS gateway
const ipfs = create({ url: 'http://localhost:5001' });

// replace with api to source train data
import fs from 'fs/promises'; // Using the promise-based version of the fs module

// base urls to make peaq & ipfs network connections
const AGUNG_BASE_URL = "wss://wsspc1-qa.agung.peaq.network";

const TRAIN1_DATA_PATH = 'data/train1_data.json'; // in practice the device would have this information, not hardcoded data values
const TRAIN2_DATA_PATH = 'data/train2_data.json';

const time_values = ['t0', 't1']

// Three Wallets:
// 1. Administrator
// 2. Train 1
// 3. Train 2


// Have 2 programs:
// 1. oracle (this file) writes to ipfs every 2 minutes
// 2. verification system that utilizes verifiable data registiry creates did document, 
// reads just created did document, hashes old, updates the same named with the signature of old did document(with signature and ipfs endpoint),
// verifies using the issuer in the current did document
// 3. How can I incorpate steps 1 and 2 together in order to create an automated system of verifiable proof-based machine origin confirmation
// - store cid as 'data' in service endpoint


// Oracles:
// - Adds train data to ipfs every 2 minutes
// - Each train has its own did document (TODO multiprocessing/more programs for multiple trains running at the same time?)
//      - updated every 2 minutes with new data stored on ipfs
//      - link current and previous by including hash of previous
//      = store data on ipfs
// - cid is returned back from each addition
// - store returned cid in 'data' object inside of the correct service
// by updating the did document 

//After added to ipfs storage for the first get the cid value back.
// Add that value to the service 


async function ipfsRead(cids){
    let results = []

    for (const cid of cids) {
        console.log(cid);
        const retrievedData = [];
        for await (const chunk of ipfs.cat(cid)) {
            retrievedData.push(chunk);
        }
        const result = JSON.parse(Buffer.concat(retrievedData).toString());

        // Convert retrieved data to string
        results.push(result);
    }
    console.log("read ipfs results: ", results);
}

async function ipfsAdd(train_data){
    const { cid } = await ipfs.add(JSON.stringify(train_data));
    // Log the CID
    console.log('Stored data CID:', cid.toString());

    return cid.toString();
}

// Function to print train details
async function addTrainAtTimeT(train1) {
    let cids = [];

    for (let t in train1) {
        const data = train1[t];
        const cid = await ipfsAdd(data)
        cids.push(cid);

        // before added a new one, must confirm the validity of the stored cid and signature
        // - add delay timer to wait for confirmations
        // 60000 milliseconds = 1 minute
        
    }
    console.log("cids added: ", cids);
    return cids;
}

// read all data at once; typically requests would be made to data oracles
async function readFile(data_path){
    const _train = await fs.readFile(data_path, 'utf8');
    const train = JSON.parse(_train);
    return train
}

async function main() {
    const train1 = await readFile(TRAIN1_DATA_PATH);
    const train2 = await readFile(TRAIN2_DATA_PATH);

    const cids = await addTrainAtTimeT(train1); // add both at same time?

    const ipfs_read_data = await ipfsRead(cids);
    
}

export {main}