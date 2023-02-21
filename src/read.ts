import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Address, TonClient } from "ton";
import InterviewsContract from "./contract";

(async () => {
  const endpoint = await getHttpEndpoint({ network: "mainnet" });
  const client = new TonClient({ endpoint });

  const contractAddress = Address.parse(
    "EQDhGwKa1nU-FbgrfIbL8NWGP-RxZ_yyEWp8qzqc85c-9HfK"
  );
  const contract = new InterviewsContract(contractAddress);
  const openedContract = client.open(contract);

  const interview = await openedContract.getInterview(0n);
  console.log(`{
       id: ${interview.id},
       price: ${interview.price},
       creatorAddress: '${interview.creatorAddress}',
       payerAddress: '${interview.payerAddress}',
       status: '${interview.status}'
    }`);
})();
