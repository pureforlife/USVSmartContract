const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = require("@solana/spl-token");

describe("NFT Minting Test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.NftAuthProgram;
  const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  
  // Test data
  const treasury = Keypair.generate();
  let programStatePDA;
  let collectionMintPDA;
  
  it("Initialize program", async () => {
    // Derive PDAs
    [programStatePDA] = await PublicKey.findProgramAddress(
      [Buffer.from("state")],
      program.programId
    );
    
    [collectionMintPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("collection")],
      program.programId
    );
    
    // Initialize
    const tx = await program.methods
      .initialize()
      .accounts({
        programState: programStatePDA,
        collectionMint: collectionMintPDA,
        authority: provider.wallet.publicKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log("✅ Program initialized! TX:", tx);
  });
  
  it("Create collection NFT", async () => {
    const [collectionMetadata] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        collectionMintPDA.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );
    
    const [collectionMasterEdition] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        collectionMintPDA.toBuffer(),
        Buffer.from("edition"),
      ],
      METADATA_PROGRAM_ID
    );
    
    const collectionTokenAccount = await getAssociatedTokenAddress(
      collectionMintPDA,
      provider.wallet.publicKey
    );
    
    const tx = await program.methods
      .createCollection(
        "https://example.com/collection.json",
        "Product Authentication NFTs",
        "PAUTH"
      )
      .accounts({
        programState: programStatePDA,
        collectionMint: collectionMintPDA,
        collectionTokenAccount,
        collectionMetadata,
        collectionMasterEdition,
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        metadataProgram: METADATA_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log("✅ Collection created! TX:", tx);
  });
  
  it("Register and mint product NFT", async () => {
    const qrCode = "TEST_QR_" + Date.now().toString().slice(-8);
    
    // Register product
    const [productPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("product"), Buffer.from(qrCode)],
      program.programId
    );
    
    await program.methods
      .registerProduct(
        qrCode,
        "TEST-PROD-001",
        "https://example.com/product.json"
      )
      .accounts({
        productRecord: productPDA,
        authority: provider.wallet.publicKey,
        programState: programStatePDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log("✅ Product registered!");
    
    // Mint NFT
    const [nftMintPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("nft_mint"), Buffer.from(qrCode)],
      program.programId
    );
    
    const nftTokenAccount = await getAssociatedTokenAddress(
      nftMintPDA,
      provider.wallet.publicKey
    );
    
    const mintTx = await program.methods
      .mintNft(qrCode)
      .accounts({
        productRecord: productPDA,
        programState: programStatePDA,
        nftMint: nftMintPDA,
        nftTokenAccount,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();
    
    console.log("✅ NFT minted! TX:", mintTx);
    
    // Create metadata
    const [nftMetadata] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        nftMintPDA.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );
    
    const [nftMasterEdition] = await PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        METADATA_PROGRAM_ID.toBuffer(),
        nftMintPDA.toBuffer(),
        Buffer.from("edition"),
      ],
      METADATA_PROGRAM_ID
    );
    
    const metadataTx = await program.methods
      .createNftMetadata(qrCode)
      .accounts({
        productRecord: productPDA,
        programState: programStatePDA,
        nftMint: nftMintPDA,
        nftMetadata,
        nftMasterEdition,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        metadataProgram: METADATA_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log("✅ NFT metadata created! TX:", metadataTx);
    console.log("🎨 View NFT: https://explorer.solana.com/address/" + nftMintPDA.toString() + "?cluster=devnet");
  });
});
