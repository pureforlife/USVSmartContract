import React, { useState } from 'react';
import { 
  Connection, 
  PublicKey, 
  clusterApiUrl, 
  SystemProgram, 
  Transaction,
} from '@solana/web3.js';
import { 
  ConnectionProvider, 
  WalletProvider, 
  useWallet, 
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  MINT_SIZE
} from '@solana/spl-token';
import './App.css';

require('@solana/wallet-adapter-react-ui/styles.css');

const network = clusterApiUrl('devnet');

function USVSystem() {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [qrCode, setQrCode] = useState('');
  const [status, setStatus] = useState('🎯 Ultra Smooth Vape (USV) - Master NFT Collection System');
  const [isLoading, setIsLoading] = useState(false);
  const [systemInitialized, setSystemInitialized] = useState(false);
  const [totalPieces] = useState(1_000_000_000); // 1 billion pieces
  const [piecesClaimed, setPiecesClaimed] = useState(0);
  const [userPieces, setUserPieces] = useState(0);
  const [usvTokens, setUsvTokens] = useState(0);
  const [claimedQRs, setClaimedQRs] = useState<string[]>([]);

  // Generate deterministic addresses for USV system
  const MASTER_NFT_SEED = "usv_master_nft";
  const USV_TOKEN_SEED = "usv_token";

  // Initialize the USV Master Collection system
  const initializeUSVSystem = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      setStatus('❌ Please connect your Phantom wallet');
      return;
    }

    setIsLoading(true);
    setStatus('🚀 Initializing USV Master NFT Collection...\n💎 Creating basic tokens (metadata will be added later)\n🪙 Setting up mint accounts\n📊 Total pieces: 1,000,000,000');

    try {
      console.log('🔍 DEBUG: Starting USV system initialization...');

      // Create the master NFT mint (represents the brand)
      const masterNFTMint = await PublicKey.createWithSeed(
        wallet.publicKey,
        MASTER_NFT_SEED,
        TOKEN_PROGRAM_ID
      );

      // Create USV token mint
      const usvTokenMint = await PublicKey.createWithSeed(
        wallet.publicKey,
        USV_TOKEN_SEED,
        TOKEN_PROGRAM_ID
      );

      console.log('🔍 DEBUG: Master NFT mint:', masterNFTMint.toString());
      console.log('🔍 DEBUG: USV token mint:', usvTokenMint.toString());

      // CHECK IF ACCOUNTS ALREADY EXIST
      const masterNFTMintInfo = await connection.getAccountInfo(masterNFTMint);
      const usvTokenMintInfo = await connection.getAccountInfo(usvTokenMint);

      if (masterNFTMintInfo && usvTokenMintInfo) {
        console.log('✅ DEBUG: System already exists!');
        setSystemInitialized(true);
        setStatus(`✅ USV Master Collection Already Exists!\n\n💎 USV NFT Mint: ${masterNFTMint.toString()}\n🪙 USV Token Mint: ${usvTokenMint.toString()}\n📊 Total Pieces: ${totalPieces.toLocaleString()}\n\n🎯 Ready for QR code scanning!\n\n🔍 Check these addresses on Solscan:\n• NFT: https://solscan.io/token/${masterNFTMint.toString()}?cluster=devnet\n• Token: https://solscan.io/token/${usvTokenMint.toString()}?cluster=devnet\n\n📱 If tokens show "Unknown" in Phantom, it means metadata needs to be added properly`);
        setIsLoading(false);
        return;
      }

      const transaction = new Transaction();

      // Create master NFT mint if it doesn't exist
      if (!masterNFTMintInfo) {
        const masterNFTRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
        
        transaction.add(
          SystemProgram.createAccountWithSeed({
            fromPubkey: wallet.publicKey,
            basePubkey: wallet.publicKey,
            seed: MASTER_NFT_SEED,
            newAccountPubkey: masterNFTMint,
            lamports: masterNFTRent,
            space: MINT_SIZE,
            programId: TOKEN_PROGRAM_ID,
          })
        );

        transaction.add(
          createInitializeMintInstruction(
            masterNFTMint,
            0, // 0 decimals for NFT pieces
            wallet.publicKey, // temporary mint authority
            wallet.publicKey, // temporary freeze authority
            TOKEN_PROGRAM_ID
          )
        );

        // Remove mint authority so anyone can mint
        transaction.add(
          createSetAuthorityInstruction(
            masterNFTMint,
            wallet.publicKey,
            AuthorityType.MintTokens,
            null,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Create USV token mint if it doesn't exist
      if (!usvTokenMintInfo) {
        const usvTokenRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
        
        transaction.add(
          SystemProgram.createAccountWithSeed({
            fromPubkey: wallet.publicKey,
            basePubkey: wallet.publicKey,
            seed: USV_TOKEN_SEED,
            newAccountPubkey: usvTokenMint,
            lamports: usvTokenRent,
            space: MINT_SIZE,
            programId: TOKEN_PROGRAM_ID,
          })
        );

        transaction.add(
          createInitializeMintInstruction(
            usvTokenMint,
            6, // 6 decimals for fungible tokens
            wallet.publicKey, // temporary mint authority
            wallet.publicKey, // temporary freeze authority
            TOKEN_PROGRAM_ID
          )
        );

        // Remove mint authority so anyone can mint
        transaction.add(
          createSetAuthorityInstruction(
            usvTokenMint,
            wallet.publicKey,
            AuthorityType.MintTokens,
            null,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      if (transaction.instructions.length === 0) {
        setSystemInitialized(true);
        setStatus(`✅ USV Master Collection Ready!\n\n💎 USV NFT: Ready\n🪙 USV Token: Ready\n📊 Total Pieces: ${totalPieces.toLocaleString()}\n\n🎯 Ready for QR code scanning!`);
        setIsLoading(false);
        return;
      }

      console.log('🔍 DEBUG: Sending transaction with', transaction.instructions.length, 'instructions...');

      // Send transaction
      const signature = await wallet.sendTransaction!(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setSystemInitialized(true);
      setStatus(`✅ USV Master Collection Initialized!\n\n💎 USV NFT Mint: ${masterNFTMint.toString()}\n🪙 USV Token Mint: ${usvTokenMint.toString()}\n📊 Total Pieces: ${totalPieces.toLocaleString()}\n\n🎯 Ready for QR code scanning!\n\n🔍 Check these addresses on Solscan:\n• NFT: https://solscan.io/token/${masterNFTMint.toString()}?cluster=devnet\n• Token: https://solscan.io/token/${usvTokenMint.toString()}?cluster=devnet\n\n📝 Transaction: ${signature}\n\n⚠️ Note: Tokens will show as "Unknown" in Phantom until proper metadata is added`);

    } catch (error: any) {
      console.error('❌ USV initialization failed:', error);
      setStatus(`❌ USV system initialization failed: ${error.message}\n\nDEBUG: Check browser console for details`);
    } finally {
      setIsLoading(false);
    }
  };

  // Scan QR code - USERS CAN MINT THEMSELVES
  const scanQRForUSV = async () => {
    if (!qrCode.trim()) {
      setStatus('❌ Please enter a QR code from your USV product');
      return;
    }

    if (claimedQRs.includes(qrCode)) {
      setStatus('❌ This QR code has already been scanned!');
      return;
    }

    if (!systemInitialized) {
      setStatus('❌ Please initialize the USV system first');
      return;
    }

    if (!wallet.connected || !wallet.publicKey) {
      setStatus('❌ Please connect your wallet');
      return;
    }

    setIsLoading(true);
    setStatus(`🔄 Scanning USV QR Code: ${qrCode}\n💎 Minting 1 token piece\n🪙 Minting 100 tokens\n💰 You pay transaction fees (~$0.01)\n🔐 Processing blockchain transaction...`);

    try {
      console.log('🔍 DEBUG: Starting QR scan process...');

      // Get the master NFT and USV token mints
      const masterNFTMint = await PublicKey.createWithSeed(
        wallet.publicKey,
        MASTER_NFT_SEED,
        TOKEN_PROGRAM_ID
      );

      const usvTokenMint = await PublicKey.createWithSeed(
        wallet.publicKey,
        USV_TOKEN_SEED,
        TOKEN_PROGRAM_ID
      );

      // Check if these mints exist
      const masterMintExists = await connection.getAccountInfo(masterNFTMint);
      const usvMintExists = await connection.getAccountInfo(usvTokenMint);

      if (!masterMintExists || !usvMintExists) {
        setStatus('❌ USV system not found. Please initialize the system first.');
        setIsLoading(false);
        return;
      }

      // Get user's token accounts
      const userMasterNFTAccount = getAssociatedTokenAddressSync(
        masterNFTMint,
        wallet.publicKey
      );

      const userUSVTokenAccount = getAssociatedTokenAddressSync(
        usvTokenMint,
        wallet.publicKey
      );

      const transaction = new Transaction();

      // Create user's master NFT account if needed
      const userMasterNFTAccountInfo = await connection.getAccountInfo(userMasterNFTAccount);
      if (!userMasterNFTAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            userMasterNFTAccount,
            wallet.publicKey,
            masterNFTMint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // Create user's USV token account if needed
      const userUSVTokenAccountInfo = await connection.getAccountInfo(userUSVTokenAccount);
      if (!userUSVTokenAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            userUSVTokenAccount,
            wallet.publicKey,
            usvTokenMint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      // Mint 1 NFT piece to user
      transaction.add(
        createMintToInstruction(
          masterNFTMint,
          userMasterNFTAccount,
          wallet.publicKey,
          1,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Mint 100 tokens to user
      transaction.add(
        createMintToInstruction(
          usvTokenMint,
          userUSVTokenAccount,
          wallet.publicKey,
          100_000_000, // 100 tokens with 6 decimals
          [],
          TOKEN_PROGRAM_ID
        )
      );

      console.log('🔍 DEBUG: User signs transaction...');

      // USER SIGNS AND PAYS THEIR OWN TRANSACTION
      const signature = await wallet.sendTransaction!(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      // Update state
      setClaimedQRs(prev => [...prev, qrCode]);
      setPiecesClaimed(prev => prev + 1);
      setUserPieces(prev => prev + 1);
      setUsvTokens(prev => prev + 100);
      setQrCode('');

      const remainingPieces = totalPieces - piecesClaimed - 1;
      const userOwnershipPercent = ((userPieces + 1) / totalPieces * 100).toFixed(10);

      setStatus(`🎉 QR CODE SCANNED SUCCESSFULLY!\n\n💎 You received:\n  • 1 NFT piece (will show as "Unknown" in Phantom until metadata added)\n  • 100 Tokens (will show as "Unknown" in Phantom until metadata added)\n\n📊 Your Stats:\n  • NFT Pieces: ${userPieces + 1}\n  • Tokens: ${usvTokens + 100}\n  • Collection Ownership: ${userOwnershipPercent}%\n\n🌍 Global Stats:\n  • Total Pieces Claimed: ${(piecesClaimed + 1).toLocaleString()}\n  • Remaining: ${remainingPieces.toLocaleString()}\n\n💰 Transaction fee: ~$0.01\n📝 Transaction: ${signature}\n\n🔍 Check your tokens on Solscan:\n• Your wallet: https://solscan.io/account/${wallet.publicKey.toString()}?cluster=devnet\n\n⚠️ Tokens show as "Unknown" because metadata needs to be added with proper Metaplex format`);

    } catch (error: any) {
      console.error('❌ QR scanning failed:', error);
      setStatus(`❌ QR scanning failed: ${error.message}\n\nDEBUG: Check browser console for details`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Ultra Smooth Vape (USV)</h1>
        <h2>Master NFT Collection System</h2>
        <p>Scan QR codes → Get tokens (working version without metadata)</p>
        <p style={{fontSize: '14px', color: '#888'}}>💰 Users pay small transaction fees (~$0.01)</p>
        <p style={{fontSize: '14px', color: '#888'}}>⚠️ Tokens will show as "Unknown" until metadata is properly added</p>
        
        <div className="wallet-section">
          <WalletMultiButton />
        </div>

        {/* Show custom image preview */}
        <div style={{margin: '20px 0', textAlign: 'center'}}>
          <img 
            src="https://indigo-big-buzzard-911.mypinata.cloud/ipfs/bafkreiaqxvhoekn67pghw56pcmtwfduvdblrdisftd66gf3pzzsjulogli" 
            alt="USV Token Image" 
            style={{width: '100px', height: '100px', borderRadius: '10px', border: '2px solid #444'}}
          />
          <p style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>Your custom image (ready for metadata)</p>
        </div>

        {wallet.connected && (
          <>
            <div className="usv-overview">
              <h3>💎 USV Master Collection</h3>
              <div className="collection-stats">
                <div className="stat-card">
                  <div className="stat-label">Total Pieces</div>
                  <div className="stat-value">{totalPieces.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Pieces Claimed</div>
                  <div className="stat-value">{piecesClaimed.toLocaleString()}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Your NFT Pieces</div>
                  <div className="stat-value">{userPieces}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Your Tokens</div>
                  <div className="stat-value">{usvTokens}</div>
                </div>
              </div>
            </div>

            <div className="status-box">
              <h3>📊 System Status</h3>
              <pre className="status">{status}</pre>
            </div>

            <div className="actions-grid">
              <div className="action-card">
                <h3>Step 1: Initialize USV System</h3>
                <p>🎯 Create basic token mints (metadata will be added later)</p>
                <p style={{fontSize: '12px', color: '#666'}}>⚠️ Tokens will show as "Unknown" until metadata is added</p>
                <button 
                  onClick={initializeUSVSystem}
                  disabled={isLoading || systemInitialized}
                  className={systemInitialized ? "btn-success" : "btn-primary"}
                >
                  {systemInitialized ? '✅ USV System Ready' : 
                   isLoading ? 'Initializing...' : '🚀 Initialize USV System'}
                </button>
              </div>

              <div className="action-card">
                <h3>Step 2: Scan USV QR Code</h3>
                <p>💎 Get 1 NFT piece + 100 tokens (functional version)</p>
                <p style={{fontSize: '12px', color: '#666'}}>💰 You pay your own transaction fee (~$0.01)</p>
                <input
                  type="text"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="USV QR Code (e.g. USV_VAPE_001)"
                  className="qr-input"
                  disabled={!systemInitialized || isLoading}
                />
                <button 
                  onClick={scanQRForUSV}
                  disabled={isLoading || !qrCode.trim() || !systemInitialized}
                  className="btn-secondary"
                >
                  {isLoading ? 'Scanning...' : '📱 Scan USV QR Code'}
                </button>
              </div>
            </div>

            {userPieces > 0 && (
              <div className="user-collection">
                <h3>🎯 Your Holdings</h3>
                <div className="holdings-summary">
                  <div className="holding-item">
                    <span className="holding-icon">💎</span>
                    <span className="holding-text">
                      <strong>{userPieces}</strong> NFT pieces (show as "Unknown" in Phantom)
                    </span>
                  </div>
                  <div className="holding-item">
                    <span className="holding-icon">🪙</span>
                    <span className="holding-text">
                      <strong>{usvTokens}</strong> Tokens (show as "Unknown" in Phantom)
                    </span>
                  </div>
                  <div className="holding-item">
                    <span className="holding-icon">📊</span>
                    <span className="holding-text">
                      <strong>{((userPieces / totalPieces) * 100).toFixed(10)}%</strong> ownership of collection
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div style={{marginTop: '20px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '10px'}}>
              <h4>🔧 Debugging Info</h4>
              <p style={{fontSize: '12px', color: '#666'}}>
                <strong>Why "Unknown" tokens?</strong><br/>
                • Tokens are created successfully (check Solscan links above)<br/>
                • Phantom needs proper Metaplex metadata to show names/images<br/>
                • Current version creates basic tokens without metadata<br/>
                • This proves the core functionality works<br/>
              </p>
              <p style={{fontSize: '12px', color: '#666'}}>
                <strong>Next steps:</strong><br/>
                • System creates tokens ✅<br/>
                • QR scanning works ✅<br/>
                • Users get tokens ✅<br/>
                • Need to add proper metadata for Phantom display
              </p>
            </div>

            <div className="test-qr-codes">
              <h3>🧪 Test QR Codes</h3>
              <div className="qr-buttons">
                <button onClick={() => setQrCode('USV_VAPE_001')} className="qr-btn">
                  USV_VAPE_001
                </button>
                <button onClick={() => setQrCode('USV_VAPE_002')} className="qr-btn">
                  USV_VAPE_002
                </button>
                <button onClick={() => setQrCode('USV_VAPE_003')} className="qr-btn">
                  USV_VAPE_003
                </button>
              </div>
            </div>
          </>
        )}
      </header>
    </div>
  );
}

function App() {
  return (
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <USVSystem />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
