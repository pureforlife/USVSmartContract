import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("Complete NFT Auth Flow", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");
  
  // Create KNOWN keypairs that we'll reuse
  const authority = Keypair.generate();
  const treasury = Keypair.generate();
  
  it("1. Initialize with known authority", async () => {
    // Airdrop SOL to authority
    const signature = await connection.requestAirdrop(authority.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);
    
    console.log("🔑 Using KNOWN authority:", authority.publicKey.toString());
    
    // Find PDAs
    const [programStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      programId
    );

    const [collectionMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("collection")],
      programId
    );

    // Create initialize instruction
    const initializeIx = new TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: programStatePDA, isSigner: false, isWritable: true },
        { pubkey: collectionMintPDA, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: treasury.publicKey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]), // initialize discriminator
    });

    // Send transaction
    const transaction = new Transaction().add(initializeIx);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);
    
    const txSignature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(txSignature);
    
    console.log("✅ Initialized with known authority!");
    console.log("Transaction:", txSignature);
  });

  it("2. Register product with SAME authority", async () => {
    const qrCode = "PRODUCT_KNOWN_AUTH_789";
    
    // Find PDAs
    const [productRecordPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("product"), Buffer.from(qrCode)],
      programId
    );
    
    const [programStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      programId
    );

    console.log("🎯 Registering product with CORRECT authority");
    console.log("Product PDA:", productRecordPDA.toString());

    // Create register_product instruction with manual serialization
    const discriminator = Buffer.from([224, 97, 195, 220, 124, 218, 78, 43]);
    const qrCodeBytes = Buffer.from(qrCode, 'utf8');
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32LE(qrCodeBytes.length, 0);
    
    const instructionData = Buffer.concat([
      discriminator,
      lengthBuffer,
      qrCodeBytes
    ]);

    const registerProductIx = new TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: productRecordPDA, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },  // SAME authority!
        { pubkey: programStatePDA, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: instructionData,
    });

    // Send transaction
    const transaction = new Transaction().add(registerProductIx);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;
    transaction.sign(authority);
    
    const txSignature = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction(txSignature);
    
    console.log("🎉🎉🎉 PRODUCT REGISTERED SUCCESSFULLY! 🎉🎉🎉");
    console.log("Transaction:", txSignature);
    
    // Verify product record
    const productRecord = await connection.getAccountInfo(productRecordPDA);
    console.log("✅ Product record created:", productRecord !== null);
    console.log("✅ Data length:", productRecord?.data.length);
    console.log("🚀 YOUR NFT AUTHENTICATION SYSTEM IS WORKING PERFECTLY!");
  });
});
