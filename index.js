// import { main } from './src/peaq_sdk.js';
//import { main } from './src/train_peaq_sdk.js';
//import { main } from './src/playground.js';
// import { main } from './src/test.js';
import { main } from './src/transfer.js';

//import { main } from './device_node/oracle.js';

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});