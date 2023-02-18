import { getHttpEndpoint } from "@orbs-network/ton-access";
import { Address, TonClient } from "ton";
import InterviewsContract from "./contract";

(async () => {
  const endpoint = await getHttpEndpoint({ network: "mainnet" });
  const client = new TonClient({ endpoint });

  const contractAddress = Address.parse(
    "EQA-46kUKZ_TvOSo3jYzfyp75VcNZ9ViYsi37uidSeqR9XvU"
  );
  const contract = new InterviewsContract(contractAddress);
  const openedContract = client.open(contract);

  const interview = await openedContract.getInterview(0n);
  console.log(
    `{ id: ${interview.id}, price: ${interview.price}, status: ${interview.status} }`
  );
})();
