import fs from "fs";
import path from "path";
import {
  Blockchain,
  SandboxContract,
  TreasuryContract,
} from "@ton-community/sandbox";
import { Cell } from "ton";

import InterviewContract from "../src/contract";

jest.setTimeout(10000);

describe("The Interview contract", () => {
  let blockchain: Blockchain;
  let wallet1: SandboxContract<TreasuryContract>;
  let wallet2: SandboxContract<TreasuryContract>;
  let wallet3: SandboxContract<TreasuryContract>;
  let interviewCode: Cell;
  let interviewContract: SandboxContract<InterviewContract>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    wallet1 = await blockchain.treasury("user1");
    wallet2 = await blockchain.treasury("user2");
    wallet3 = await blockchain.treasury("user3");

    interviewCode = Cell.fromBoc(
      fs.readFileSync(path.join(__dirname, "..", "compiled", "interview.cell"))
    )[0];
  });

  describe("when just created", () => {
    beforeEach(async () => {
      const interview = InterviewContract.createForDeploy(
        interviewCode,
        10000n,
        wallet1.address,
        new Date(Date.now() + 1000 * 60 * 60),
        new Date(Date.now() + 1000 * 60 * 60 * 2)
      );

      interviewContract = blockchain.openContract(interview);
      await interviewContract.sendDeploy(wallet1.getSender());
    });

    it("should return info", async () => {
      const info = await interviewContract.getInterview();

      expect(info.price).toBe(10000n);
      expect(info.creatorAddress).toBe(wallet1.address.toString());
      expect(info.payerAddress).toBe(wallet1.address.toString());
      expect(info.status).toBe("created");
    });

    describe("and when someone buys the interview", () => {
      describe("and when that someone is the creator of the interview", () => {
        it("should not change anything", async () => {
          await interviewContract.sendInterviewPurchase(wallet1.getSender());

          const info = await interviewContract.getInterview();
          expect(info.payerAddress).toBe(wallet1.address.toString());
          expect(info.status).toBe("created");
        });
      });

      describe("and when that someone is another user", () => {
        describe("and when there is enough TON for purchasing", () => {
          it("should change status and payer address of the interview", async () => {
            await interviewContract.sendInterviewPurchase(wallet2.getSender());

            const info = await interviewContract.getInterview();
            expect(info.payerAddress).toBe(wallet2.address.toString());
            expect(info.status).toBe("paid");
          });
        });

        describe("and when there is not enough TON for purchasing", () => {
          beforeEach(async () => {
            const interview = InterviewContract.createForDeploy(
              interviewCode,
              1000000000000000n,
              wallet1.address,
              new Date(Date.now() + 1000 * 60 * 60),
              new Date(Date.now() + 1000 * 60 * 60 * 2)
            );

            interviewContract = blockchain.openContract(interview);
            await interviewContract.sendDeploy(wallet1.getSender());
          });

          it("should not change anything", async () => {
            await interviewContract.sendInterviewPurchase(wallet2.getSender());

            const info = await interviewContract.getInterview();
            expect(info.payerAddress).toBe(wallet1.address.toString());
            expect(info.status).toBe("created");
          });
        });

        describe("and when the interview is already ended", () => {
          beforeEach(async () => {
            const interview = InterviewContract.createForDeploy(
              interviewCode,
              10000n,
              wallet1.address,
              new Date(Date.now() - 1000 * 60 * 60 * 2),
              new Date(Date.now() - 1000 * 60 * 60)
            );

            interviewContract = blockchain.openContract(interview);
            await interviewContract.sendDeploy(wallet1.getSender());
          });

          it("should not change anything", async () => {
            await interviewContract.sendInterviewPurchase(wallet2.getSender());

            const info = await interviewContract.getInterview();
            expect(info.payerAddress).toBe(wallet1.address.toString());
            expect(info.status).toBe("created");
          });
        });

        describe("and when the interview is already canceled", () => {
          beforeEach(async () => {
            await interviewContract.sendInterviewCancellation(
              wallet1.getSender()
            );
          });

          it("should not change anything", async () => {
            await interviewContract.sendInterviewPurchase(wallet2.getSender());

            const info = await interviewContract.getInterview();
            expect(info.payerAddress).toBe(wallet1.address.toString());
            expect(info.status).toBe("canceled");
          });
        });
      });
    });

    describe("and when someone cancels the interview", () => {
      describe("and when that someone is not the creator nor the payer", () => {
        it("should not change anything", async () => {
          await interviewContract.sendInterviewCancellation(
            wallet3.getSender()
          );

          const info = await interviewContract.getInterview();
          expect(info.payerAddress).toBe(wallet1.address.toString());
          expect(info.status).toBe("created");
        });
      });

      describe("and when someone is the owner", () => {
        it("should cancel the interview", async () => {
          await interviewContract.sendInterviewCancellation(
            wallet1.getSender()
          );

          const info = await interviewContract.getInterview();
          expect(info.payerAddress).toBe(wallet1.address.toString());
          expect(info.status).toBe("canceled");
        });

        describe("and when the interview is already finished", () => {
          beforeEach(async () => {
            const interview = InterviewContract.createForDeploy(
              interviewCode,
              10000n,
              wallet1.address,
              new Date(Date.now()),
              new Date(Date.now() + 5000)
            );

            interviewContract = blockchain.openContract(interview);
            await interviewContract.sendDeploy(wallet1.getSender());
            await interviewContract.sendInterviewPurchase(wallet2.getSender());

            await new Promise((res) => setTimeout(res, 5000));
            await interviewContract.sendInterviewFinish(wallet2.getSender());
          });

          it("should not change anything", async () => {
            await interviewContract.sendInterviewCancellation(
              wallet1.getSender()
            );

            const info = await interviewContract.getInterview();
            expect(info.payerAddress).toBe(wallet2.address.toString());
            expect(info.status).toBe("finished");
          });
        });
      });
    });

    describe("and when someone finishes the interview", () => {
      describe("and when the interview is not purchased", () => {
        beforeEach(async () => {
          const interview = InterviewContract.createForDeploy(
            interviewCode,
            10000n,
            wallet1.address,
            new Date(Date.now()),
            new Date(Date.now() + 5000)
          );

          interviewContract = blockchain.openContract(interview);
          await interviewContract.sendDeploy(wallet1.getSender());

          await new Promise((res) => setTimeout(res, 5000));
        });

        it("should not change anything", async () => {
          await interviewContract.sendInterviewFinish(wallet1.getSender());

          const info = await interviewContract.getInterview();
          expect(info.payerAddress).toBe(wallet1.address.toString());
          expect(info.status).toBe("created");
        });
      });

      describe("and when the interview is not started yet", () => {
        it("should not change anything", async () => {
          await interviewContract.sendInterviewPurchase(wallet2.getSender());
          await interviewContract.sendInterviewFinish(wallet2.getSender());

          const info = await interviewContract.getInterview();
          expect(info.payerAddress).toBe(wallet2.address.toString());
          expect(info.status).toBe("paid");
        });
      });

      describe("and when the interview is purchased and ended", () => {
        beforeEach(async () => {
          const interview = InterviewContract.createForDeploy(
            interviewCode,
            100000n,
            wallet1.address,
            new Date(Date.now()),
            new Date(Date.now() + 5000)
          );

          interviewContract = blockchain.openContract(interview);
          await interviewContract.sendDeploy(wallet1.getSender());
          await interviewContract.sendInterviewPurchase(wallet2.getSender());

          await new Promise((res) => setTimeout(res, 5000));
        });

        it("should finish the interview", async () => {
          await interviewContract.sendInterviewFinish(wallet2.getSender());

          const info = await interviewContract.getInterview();
          expect(info.payerAddress).toBe(wallet2.address.toString());
          expect(info.status).toBe("finished");
        });
      });
    });
  });
});
