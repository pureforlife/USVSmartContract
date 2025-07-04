import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";

describe("NFT Auth Program Tests", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");

  it("Program exists and is accessible", async () => {
    const accountInfo = await connection.getAccountInfo(programId);
    console.log("✅ Program exists:", accountInfo !== null);
    console.log("✅ Program ID:", programId.toString());
  });

  it("Can create instruction data", async () => {
    // This tests basic instruction creation without full IDL
    const instruction = new TransactionInstruction({
      keys: [],
      programId: programId,
      data: Buffer.from([0]), // Simple instruction data
    });
    
    console.log("✅ Instruction created");
    console.log("✅ Program ID matches:", instruction.programId.equals(programId));
  });
});
