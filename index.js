import { main } from './src/peaq_sdk.js';

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
