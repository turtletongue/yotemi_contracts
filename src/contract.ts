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

type Interview = {
  id: bigint;
  price: bigint;
  creatorAddress: string;
  payerAddress: string;
  startAt: Date;
  endAt: Date;
  status: "error" | "created" | "paid" | "canceled";
};

export default class InterviewsContract implements Contract {
  static readonly operations = {
    create: 1,
    buy: 2,
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
      creatorAddress: stack.readAddress().toString(),
      payerAddress: stack.readAddress().toString(),
      startAt: new Date(stack.readNumber() * 1000),
      endAt: new Date(stack.readNumber() * 1000),
      status: (
        {
          0: "error",
          1: "created",
          2: "paid",
          3: "canceled",
        } as const
      )[stack.readNumber()],
    };
  }

  async sendInterviewCreation(
    provider: ContractProvider,
    via: Sender,
    id: bigint,
    price: bigint,
    startAt: Date,
    endAt: Date
  ): Promise<void> {
    const messageBody = beginCell()
      .storeUint(InterviewsContract.operations.create, 32)
      .storeUint(id, 64)
      .storeUint(price, 64)
      .storeUint(Math.floor(startAt.getTime() / 1000), 32)
      .storeUint(Math.floor(endAt.getTime() / 1000), 32)
      .endCell();

    await provider.internal(via, {
      value: "0.01",
      body: messageBody,
    });
  }

  async sendInterviewPurchase(
    provider: ContractProvider,
    via: Sender,
    id: bigint
  ): Promise<void> {
    const messageBody = beginCell()
      .storeUint(InterviewsContract.operations.buy, 32)
      .storeUint(id, 64)
      .endCell();

    await provider.internal(via, {
      value: "0.01",
      body: messageBody,
    });
  }
}
