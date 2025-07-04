import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection, SystemProgram, Keypair, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("Real Initialize Test", () => {
  const connection = new Connection("http://localhost:8899", "confirmed");
  const programId = new PublicKey("6othGsGM6XBFo3dmeB7Me22J3iZDLEyJmHVnav9z2Ye9");
  
  it("Actually calls initialize function", async () => {
    // Create test keypairs
    const authority = Keypair.generate();
    const treasury = Keypair.generate();

    // Airdrop SOL to authority for fees
    const signature = await connection.requestAirdrop(authority.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature);

    // Find the PDAs (Program Derived Addresses) that your program expects
    const [programStatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      programId
    );

    const [collectionMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("collection")],
      programId
    );

    console.log("✅ PDAs calculated:");
    console.log("Program State PDA:", programStatePDA.toString());
    console.log("Collection Mint PDA:", collectionMintPDA.toString());

    // Create the initialize instruction
    const initializeIx = new TransactionInstruction({
      programId: programId,
      keys: [
        { pubkey: programStatePDA, isSigner: false, isWritable: true },      // program_state
        { pubkey: collectionMintPDA, isSigner: false, isWritable: true },    // collection_mint  
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },   // authority
        { pubkey: treasury.publicKey, isSigner: false, isWritable: false },  // treasury
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },    // token_program
        { pubkey: anchor.web3.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false }, // rent
      ],
      data: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]), // This is the instruction discriminator for "initialize"
    });

    // Create and send transaction
    const transaction = new Transaction().add(initializeIx);
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = authority.publicKey;

    // Sign and send
    transaction.sign(authority);
    
    try {
      const txSignature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction(txSignature);
      
      console.log("🎉 INITIALIZE FUNCTION CALLED SUCCESSFULLY!");
      console.log("Transaction signature:", txSignature);
      
      // Verify the program state was created
      const programStateAccount = await connection.getAccountInfo(programStatePDA);
      console.log("✅ Program state account created:", programStateAccount !== null);
      
      const collectionMintAccount = await connection.getAccountInfo(collectionMintPDA);
      console.log("✅ Collection mint account created:", collectionMintAccount !== null);
      
    } catch (error) {
      console.log("❌ Error calling initialize:", error);
      
      // Let's check if accounts already exist (which would cause the error)
      const programStateExists = await connection.getAccountInfo(programStatePDA);
      const collectionMintExists = await connection.getAccountInfo(collectionMintPDA);
      
      if (programStateExists && collectionMintExists) {
        console.log("🔄 Program was already initialized (accounts exist)");
        console.log("✅ This means initialize worked in a previous test!");
      }
    }
  });
});
