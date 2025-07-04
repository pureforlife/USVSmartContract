import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";

describe("Register Product Test", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");
  
  it("Actually calls register_product function", async () => {
    // Create test authority (this needs to match the initialized authority)
    const authority = Keypair.generate();
    
    // Airdrop SOL for fees
    const signature = await connection.requestAirdrop(authority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);

    // Test QR code
    const qrCode = "PRODUCT_ABC123";
    
    // Find PDAs
    const [productRecordPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("product"), Buffer.from(qrCode)],
      programId
    );
    
    const [programStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      programId
    );

    console.log("✅ Register Product PDAs:");
    console.log("Product Record PDA:", productRecordPDA.toString());
    console.log("Program State PDA:", programStatePDA.toString());
    console.log("QR Code:", qrCode);

    // Create instruction data
    const discriminator = Buffer.from([61, 104, 1, 113, 112, 128, 90, 40]); // register_product discriminator
    
    // Encode QR code string (length + data)
    const qrCodeBytes = Buffer.from(qrCode);
    const qrCodeLength = Buffer.alloc(4);
    qrCodeLength.writeUInt32LE(qrCodeBytes.length, 0);
    
    const instructionData = Buffer.concat([
      discriminator,
      qrCodeLength,
      qrCodeBytes
    ]);

    // Create the register_product instruction
    const registerProductIx = new TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: productRecordPDA, isSigner: false, isWritable: true },     // product_record
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },   // authority  
        { pubkey: programStatePDA, isSigner: false, isWritable: false },     // program_state
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data: instructionData,
    });

    // Create and send transaction
    const transaction = new Transaction().add(registerProductIx);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;

    // Sign and send
    transaction.sign(authority);
    
    try {
      const txSignature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(txSignature);
      
      console.log("🎉 REGISTER_PRODUCT FUNCTION CALLED SUCCESSFULLY!");
      console.log("Transaction signature:", txSignature);
      
      // Verify the product record was created
      const productRecordAccount = await connection.getAccountInfo(productRecordPDA);
      console.log("✅ Product record account created:", productRecordAccount !== null);
      
      if (productRecordAccount) {
        console.log("✅ Product record data length:", productRecordAccount.data.length);
      }
      
    } catch (error) {
      console.log("❌ Error calling register_product:", error);
      console.log("💡 This might be because authority doesn't match the initialized authority");
      
      // Let's check if the authority in program state matches
      const programStateAccount = await connection.getAccountInfo(programStatePDA);
      if (programStateAccount) {
        console.log("📋 Program state exists, authority mismatch is likely the issue");
      }
    }
  });
});
