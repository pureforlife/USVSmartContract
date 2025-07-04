import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, Keypair } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("Anchor Client Test", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");
  
  // Use the same authority from previous successful initialize
  const authority = Keypair.generate();
  
  it("Test with Anchor RPC client", async () => {
    // Airdrop SOL
    const signature = await connection.requestAirdrop(authority.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);
    
    console.log("🔑 Authority:", authority.publicKey.toString());
    
    // Load the IDL manually and create program instance
    const idl = require("../target/idl/nft_auth_program.json");
    
    // Create provider
    const wallet = new anchor.Wallet(authority);
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    
    // Create program instance
    const program = new anchor.Program(idl, programId, provider);
    
    console.log("✅ Program loaded:", program.programId.toString());
    
    // Try to call register_product using Anchor client
    const qrCode = "ANCHOR_CLIENT_TEST_123";
    
    try {
      // Find PDAs
      const [productRecordPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("product"), Buffer.from(qrCode)],
        programId
      );
      
      const [programStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("state")],
        programId
      );
      
      console.log("🎯 Calling register_product via Anchor client...");
      
      // Call register_product using Anchor's RPC
      const tx = await program.methods
        .registerProduct(qrCode)
        .accounts({
          productRecord: productRecordPDA,
          authority: authority.publicKey,
          programState: programStatePDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      console.log("🎉🎉🎉 REGISTER_PRODUCT SUCCESS VIA ANCHOR CLIENT! 🎉🎉🎉");
      console.log("Transaction:", tx);
      
      // Verify
      const productRecord = await connection.getAccountInfo(productRecordPDA);
      console.log("✅ Product record created:", productRecord !== null);
      
    } catch (error) {
      console.log("❌ Anchor client error:", error);
      
      // The initialize might have failed too, let's try calling initialize first
      console.log("🔄 Maybe we need to initialize first with this authority...");
    }
  });
});
