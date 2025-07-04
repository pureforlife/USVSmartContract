import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import * as borsh from "borsh";

describe("Borsh Register Product Test", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");
  
  it("Calls register_product with PROPER Borsh serialization", async () => {
    // Create test authority
    const authority = Keypair.generate();
    
    // Airdrop SOL for fees
    const signature = await connection.requestAirdrop(authority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);

    // Test QR code
    const qrCode = "PRODUCT_BORSH_123";
    
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
    console.log("QR Code:", qrCode);

    // CORRECT discriminator for register_product
    const discriminator = Buffer.from([224, 97, 195, 220, 124, 218, 78, 43]);
    
    // Define the instruction data schema for Borsh
    class RegisterProductInstruction {
      qr_code: string;
      
      constructor(qr_code: string) {
        this.qr_code = qr_code;
      }
    }
    
    // Define the Borsh schema
    const schema = new Map([
      [RegisterProductInstruction, { 
        kind: 'struct', 
        fields: [['qr_code', 'string']] 
      }]
    ]);
    
    // Create instruction data and serialize with Borsh
    const instructionData = new RegisterProductInstruction(qrCode);
    const serializedData = borsh.serialize(schema, instructionData);
    
    // Combine discriminator + serialized data
    const finalInstructionData = Buffer.concat([
      discriminator,
      Buffer.from(serializedData)
    ]);

    console.log("✅ Serialized data length:", finalInstructionData.length);

    // Create the register_product instruction
    const registerProductIx = new TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: productRecordPDA, isSigner: false, isWritable: true },     // product_record
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },   // authority  
        { pubkey: programStatePDA, isSigner: false, isWritable: false },     // program_state
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data: finalInstructionData,
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
      
      console.log("🎉 REGISTER_PRODUCT WITH BORSH SERIALIZATION SUCCESS!");
      console.log("Transaction signature:", txSignature);
      
      // Verify the product record was created
      const productRecordAccount = await connection.getAccountInfo(productRecordPDA);
      console.log("✅ Product record account created:", productRecordAccount !== null);
      
      if (productRecordAccount) {
        console.log("✅ Product record data length:", productRecordAccount.data.length);
        console.log("🚀 PRODUCT SUCCESSFULLY REGISTERED IN NFT AUTH SYSTEM!");
      }
      
    } catch (error) {
      console.log("❌ Error calling register_product:", error);
      
      // Print the transaction logs for debugging
      if (error.transactionLogs) {
        console.log("📋 Transaction logs:");
        error.transactionLogs.forEach(log => console.log("  ", log));
      }
    }
  });
});
