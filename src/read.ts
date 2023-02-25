import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Address, TonClient } from "ton";

import InterviewContract from "./contract";

(async () => {
  const endpoint = await getHttpEndpoint({ network: "mainnet" });
  const client = new TonClient({ endpoint });

  const contractAddress = Address.parse(
    "EQD7m2GGI3n25X9AN2TQgWo_8hKsvApPn5ANWPvOGM0NilDX"
  );
  const contract = new InterviewContract(contractAddress);

  const openedContract = client.open(contract);

  const interview = await openedContract.getInterview();
  console.log(`{
       price: ${interview.price},
       creatorAddress: '${interview.creatorAddress}',
       payerAddress: '${interview.payerAddress}',
       startAt: '${interview.startAt.toISOString()}',
       endAt: '${interview.endAt.toISOString()}',
       status: '${interview.status}'
    }`);
})();
