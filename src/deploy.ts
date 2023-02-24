import fs from "fs";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, Cell, WalletContractV4 } from "ton";
import dotenv from "dotenv";

import InterviewContract from "./contract";

dotenv.config();

async function deploy() {
  const endpoint = await getHttpEndpoint({ network: "mainnet" });
  const client = new TonClient({ endpoint });

  // open wallet v4 (notice the correct wallet version here)
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

  // open wallet and read the current seqno of the wallet
  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  const contractCode = Cell.fromBoc(
    fs.readFileSync("./compiled/interview.cell")
  )[0];
  const contract = InterviewContract.createForDeploy(
    contractCode,
    10000n,
    walletContract.address,
    new Date(Date.now() + 1000 * 60 * 60),
    new Date(Date.now() + 1000 * 60 * 60 * 2)
  );

  // exit if contract is already deployed
  console.log("contract address:", contract.address.toString());
  if (await client.isContractDeployed(contract.address)) {
    return console.log("Contract already deployed");
  }

  // send the deploy transaction
  const openedContract = client.open(contract);
  await openedContract.sendDeploy(walletSender);

  // wait until confirmed
  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("waiting for deploy transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("deploy transaction confirmed!");
}

deploy();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
