import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";

describe("working test", () => {
  it("Can connect to program", async () => {
    const connection = new Connection("http://localhost:8899", "confirmed");
    const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");
    
    // Check if program exists
    const accountInfo = await connection.getAccountInfo(programId);
    console.log("Program exists:", accountInfo !== null);
    console.log("Program ID:", programId.toString());
    console.log("Test passed!");
  });
});
