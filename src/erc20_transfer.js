// code on how to use erc-20 precompile to transfer agung from one eth wallet to a generated wallet

// import polkadot & ethers functions to create new user wallets and interact with the erc-20 agung contract
import { cryptoWaitReady, mnemonicGenerate, encodeAddress } from '@polkadot/util-crypto';
import { hexToU8a, u8aConcat } from '@polkadot/util';
import { Keyring } from "@polkadot/keyring";
import { ethers } from 'ethers';
import { BigNumber }from 'bignumber.js';


// env vars
import dotenv from 'dotenv';
dotenv.config();
const OWNER_PRIVATE = process.env.PRIVATE_KEY; // ethereum private key of owner

// local in precompile to transfer tokens
import ABI from '../abi/erc-20.json' assert { type: "json" };
const PRECOMPILE_ADDRESS = '0x0000000000000000000000000000000000000809';

// set RPC url for ethers interaction
const RPC_URL = 'https://rpcpc1-qa.agung.peaq.network';


// create a keyring object and send tokens to the user to have them interact
async function createOwner(){
    await cryptoWaitReady();
    const owner_keyring = new Keyring({ type: "ethereum" }); 
    const privateKeyBytes = hexToU8a(OWNER_PRIVATE);
    const OwnerPair = owner_keyring.addFromSeed(privateKeyBytes);

    return OwnerPair;
}

async function generateUser(){
    // will typically generate mnemonic, but for testing it will be hard-coded
   // const mnemonic = mnemonicGenerate();
    const mnemonic = 'tower always inflict afraid ill common butter harbor fly high cream trade';

    const user_keyring = new Keyring({ type: "ethereum" }); 
    const UserPair = user_keyring.addFromUri(mnemonic);
    
    return UserPair;
}

async function transferTokens(OwnerPair, UserPair){
    // transfer tokens from Owner to the User
    try {
        // local provider and api
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(OWNER_PRIVATE, provider);
        const contract = new ethers.Contract(PRECOMPILE_ADDRESS, ABI, wallet);

        await readBalances(contract, OwnerPair, UserPair);

        // transfer tokens. This transfers 0.0001 agung (as seen from MetaMask/polkadot interfaces)
        const transferAmount = ethers.toBigInt('100000000000000');
        try {
            const tx = await contract.transferFrom(OwnerPair.address, UserPair.address, transferAmount);
            console.log(`Transaction sent: ${tx.hash}`);

            // Wait for the transaction to be mined
            await tx.wait();
            console.log('Transaction mined');
        }
        catch (error){
            console.log(error);
        }

        // read to see change
        await readBalances(contract, OwnerPair, UserPair);
    }
    catch {
        throw Error(`Owner of address ${OwnerPair.address} did not successfully transfer tokens to User with address ${UserPair.address}`);
    }

}

async function createDID(UserPair) {

    // send funds from the Owner to the User so they can create DID
    const did = `did:peaq:${UserPair.address}`;


}

async function main() {
    try {
       const OwnerPair = await createOwner();
       const UserPair = await generateUser();
       await transferTokens(OwnerPair, UserPair);
    }

    catch (error) {
        console.log(error);
    }
};

// read the balances of owner and user in readable format
async function readBalances(contract, OwnerPair, UserPair){
    const decimals = await contract.decimals();

    const owner = await contract.balanceOf(OwnerPair.address);
    const user = await contract.balanceOf(UserPair.address);

    const ownerBalance = await toHumanReadableBalance(decimals, owner);
    const userBalance = await toHumanReadableBalance(decimals, user);
    console.log(ownerBalance);
    console.log(userBalance);
}

// convert to readable based on decimals
async function toHumanReadableBalance(decimals, balance) {
    try {
        const decimalsBN = new BigNumber(decimals.toString());
        const balanceBN = new BigNumber(balance.toString())
        const readableBalance = balanceBN / (10**decimalsBN);
        return readableBalance.toString();
    }
    catch (error){
        console.log(error);
    }
}


export {main}