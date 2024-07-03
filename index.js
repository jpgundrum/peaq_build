// import { main } from './src/peaq_sdk.js';
//import { main } from './src/train_peaq_sdk.js';
//import { main } from './src/playground.js';
import { main } from './src/train_start.js';
//import { main } from './src/erc20_transfer.js';

//import { main } from './device_node/oracle.js';

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});