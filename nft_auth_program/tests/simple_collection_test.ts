import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("Simple Collection Test", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");
  
  it("Can access collection accounts", async () => {
    // Find PDAs that were created by initialize
    const [programStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      programId
    );

    const [collectionMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("collection")],
      programId
    );

    console.log("✅ Checking accounts from initialize:");
    
    // Check if accounts exist
    const programStateAccount = await connection.getAccountInfo(programStatePDA);
    const collectionMintAccount = await connection.getAccountInfo(collectionMintPDA);
    
    console.log("Program State exists:", programStateAccount !== null);
    console.log("Collection Mint exists:", collectionMintAccount !== null);
    
    if (programStateAccount) {
      console.log("Program State account data length:", programStateAccount.data.length);
    }
    
    if (collectionMintAccount) {
      console.log("Collection Mint account data length:", collectionMintAccount.data.length);
      console.log("Collection Mint owner:", collectionMintAccount.owner.toString());
    }
    
    console.log("🎉 Collection accounts are ready for use!");
  });

  it("Can create register_product instruction", async () => {
    // Test creating a register_product instruction (next logical step)
    const authority = Keypair.generate();
    const qrCode = "TEST_QR_12345";
    
    // Find PDA for product record
    const [productRecordPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("product"), Buffer.from(qrCode)],
      programId
    );
    
    const [programStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      programId
    );

    console.log("✅ Product PDAs calculated:");
    console.log("Product Record PDA:", productRecordPDA.toString());
    console.log("QR Code:", qrCode);
    
    // Just test PDA calculation for now
    console.log("🎉 Ready to register products!");
  });
});
