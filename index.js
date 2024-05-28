// import { main } from './src/peaq_sdk.js';
import { main } from './src/train_peaq_sdk.js';
//import { main } from './src/playground.js';
//import { main } from './src/test.js';

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});