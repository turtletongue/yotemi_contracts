import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Address, TonClient, WalletContractV4 } from "ton";
import { mnemonicToWalletKey } from "ton-crypto";
import dotenv from "dotenv";

import InterviewsContract from "./contract";

dotenv.config();

(async () => {
  const endpoint = await getHttpEndpoint({ network: "mainnet" });
  const client = new TonClient({ endpoint });

  const mnemonic = process.env.MNEMONIC as string | undefined;

  if (!mnemonic) {
    return console.log("Mnemonic is not set");
  }

  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({
    publicKey: key.publicKey,
    workchain: 0,
  });

  if (!(await client.isContractDeployed(wallet.address))) {
    return console.log("wallet is not deployed");
  }

  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  const contractAddress = Address.parse(
    "EQA-46kUKZ_TvOSo3jYzfyp75VcNZ9ViYsi37uidSeqR9XvU"
  );
  const contract = new InterviewsContract(contractAddress);
  const openedContract = client.open(contract);

  await openedContract.sendInterviewCreation(walletSender, 0n, 10000n);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("transaction confirmed!");
})();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
