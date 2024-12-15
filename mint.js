import * as starknet from "starknet"
import {random, readWallets, sleep} from "./common.js";
import {getGroundKey, precalculateAddress, restoreSeedPhrase, starkProvider} from "./starknet.js";

const quantumContract = '0x00b719f69b00a008a797dc48585449730aa1c09901fdbac1bc94b3bdc287cf76'

const mnemonics = readWallets('mnemonics.txt');

for (let mnemonic of mnemonics) {
    const wallet_eth = restoreSeedPhrase(mnemonic);
    const starkKeyPair = getGroundKey(0, wallet_eth.privateKey);
    const starkKeyPublic = starknet.ec.starkCurve.getStarkKey(starkKeyPair);
    const contractAddress = precalculateAddress(starkKeyPublic);

    const account = new starknet.Account(
      starkProvider,
      contractAddress,
      starkKeyPair
    )

    let call = {
      contractAddress: quantumContract,
      entrypoint: "mintPublic",
      calldata: [contractAddress],
    };

    let mintDone = false
    let hash

    while (!mintDone) {
        try {
            let exec_hash = await account.execute([call])
            hash = exec_hash.transaction_hash
            mintDone = true
        } catch (e) {
            let err = e.toString()
            if (err.includes('NFT already minted with this address')) {
                console.log(`${contractAddress}: Error -> Already minted`)
                mintDone = true
            } else {
                console.log(`${contractAddress}: Error -> ${e.toString()}`)
                await sleep(15 * 1000)
            }
        }
    }

    if (hash) {
        console.log(`${contractAddress}: Done -> https://starkscan.co/tx/${hash}`)
    }

    await sleep(random(5, 8) * 1000)
}