import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  TupleBuilder,
} from "ton-core";

type Interview = { id: bigint; price: bigint; status: number };

export default class InterviewsContract implements Contract {
  static readonly operations = {
    create: 0,
  };

  static createForDeploy(code: Cell): InterviewsContract {
    const data = beginCell().storeDict().storeDict().endCell();
    const workchain = 0;
    const address = contractAddress(workchain, { code, data });

    return new InterviewsContract(address, { code, data });
  }

  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell }
  ) {}

  async sendDeploy(provider: ContractProvider, via: Sender): Promise<void> {
    await provider.internal(via, {
      value: "0.01",
      bounce: false,
    });
  }

  async getInterview(
    provider: ContractProvider,
    id: bigint
  ): Promise<Interview> {
    const builder = new TupleBuilder();
    builder.writeNumber(id);

    const { stack } = await provider.get("interview", builder.build());

    return {
      id,
      price: stack.readBigNumber(),
      status: stack.readNumber(),
    };
  }

  async sendInterviewCreation(
    provider: ContractProvider,
    via: Sender,
    id: bigint,
    price: bigint
  ): Promise<void> {
    const messageBody = beginCell()
      .storeUint(InterviewsContract.operations.create, 32)
      .storeUint(id, 64)
      .storeUint(price, 64)
      .storeUint(0, 64) // query id
      .endCell();

    await provider.internal(via, {
      value: "0.002",
      body: messageBody,
    });
  }
}
