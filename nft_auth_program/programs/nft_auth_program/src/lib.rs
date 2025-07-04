use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("GdcoT7hsvLJsKWebA5em5127kQvEmh9JKma2YT9CWsYz");

#[program]
pub mod nft_auth_program {
    use super::*;

    // Initialize the Master NFT Collection
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.program_state;
        state.authority = ctx.accounts.authority.key();
        state.total_pieces = 1_000_000_000; // 1 billion pieces
        state.minted_pieces = 0;
        
        msg!("🎯 Master NFT Collection initialized! Ready for QR scanning!");
        Ok(())
    }

    // Register QR code for product
    pub fn register_qr_code(
        ctx: Context<RegisterQR>,
        _qr_code: String, // Prefix with _ to avoid warning
    ) -> Result<()> {
        let qr_data = &mut ctx.accounts.qr_data;
        qr_data.is_claimed = false;
        qr_data.piece_number = 0;
        
        msg!("📱 QR Code registered!");
        Ok(())
    }

    // Mint NFT piece - SIMPLIFIED VERSION (no stack overflow)
    pub fn mint_nft_piece(
        ctx: Context<MintNFT>,
        _qr_code: String, // Prefix with _ to avoid warning
    ) -> Result<()> {
        let qr_data = &mut ctx.accounts.qr_data;
        let state = &mut ctx.accounts.program_state;
        
        // Check QR not claimed
        require!(!qr_data.is_claimed, ErrorCode::QRAlreadyClaimed);
        
        // Generate piece number
        state.minted_pieces += 1;
        let piece_number = state.minted_pieces;
        qr_data.piece_number = piece_number;
        qr_data.is_claimed = true;
        qr_data.claimed_by = ctx.accounts.customer.key();
        
        // Mint NFT (supply = 1, decimals = 0 for proper NFT)
        let seeds = b"master";
        let bump = ctx.bumps.master_collection;
        let signer: &[&[&[u8]]] = &[&[seeds, &[bump]]];
        
        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.nft_mint.to_account_info(),
                    to: ctx.accounts.customer_token_account.to_account_info(),
                    authority: ctx.accounts.master_collection.to_account_info(),
                },
                signer,
            ),
            1, // Mint exactly 1 NFT
        )?;

        msg!("🎉 NFT piece #{} minted successfully!", piece_number);
        Ok(())
    }
}

// SIMPLIFIED Account structures (reduced stack usage)
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8, // Smaller space
        seeds = [b"state"],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = master_collection,
        seeds = [b"master"],
        bump
    )]
    pub master_collection: Account<'info, Mint>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(qr_code: String)]
pub struct RegisterQR<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 1 + 8 + 32, // Much smaller
        seeds = [b"qr", qr_code.as_bytes()],
        bump
    )]
    pub qr_data: Account<'info, QRData>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// SIMPLIFIED MintNFT struct (no stack overflow)
#[derive(Accounts)]
#[instruction(qr_code: String)]
pub struct MintNFT<'info> {
    #[account(
        mut,
        seeds = [b"qr", qr_code.as_bytes()],
        bump
    )]
    pub qr_data: Account<'info, QRData>,
    
    #[account(
        mut,
        seeds = [b"state"],
        bump
    )]
    pub program_state: Account<'info, ProgramState>,
    
    #[account(
        mut,
        seeds = [b"master"],
        bump
    )]
    pub master_collection: Account<'info, Mint>,
    
    #[account(
        init,
        payer = customer,
        mint::decimals = 0,
        mint::authority = master_collection,
        seeds = [b"nft", qr_code.as_bytes()],
        bump
    )]
    pub nft_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = customer,
        associated_token::mint = nft_mint,
        associated_token::authority = customer,
    )]
    pub customer_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub customer: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

// SIMPLIFIED data structures
#[account]
pub struct ProgramState {
    pub authority: Pubkey,
    pub total_pieces: u64,
    pub minted_pieces: u64,
}

#[account]
pub struct QRData {
    pub is_claimed: bool,
    pub piece_number: u64,
    pub claimed_by: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("QR code has already been claimed")]
    QRAlreadyClaimed,
}
