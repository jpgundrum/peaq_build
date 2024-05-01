// import { main } from './src/peaq_sdk.js';
import { main } from './src/train_peaq_sdk.js';

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});