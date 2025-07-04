import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";

describe("Check Program Authority", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");
  
  it("Read program state to find authority", async () => {
    // Find program state PDA
    const [programStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      programId
    );

    // Get program state account
    const programStateAccount = await connection.getAccountInfo(programStatePDA);
    
    if (programStateAccount) {
      console.log("✅ Program state found");
      console.log("Data length:", programStateAccount.data.length);
      
      // The authority is stored as the first 32 bytes after the 8-byte discriminator
      const authorityBytes = programStateAccount.data.slice(8, 40);
      const authority = new PublicKey(authorityBytes);
      
      console.log("🔑 Stored authority:", authority.toString());
      console.log("📋 Program State PDA:", programStatePDA.toString());
      
      // We need to use THIS authority for register_product, not a random one!
      
    } else {
      console.log("❌ Program state not found");
    }
  });
});
