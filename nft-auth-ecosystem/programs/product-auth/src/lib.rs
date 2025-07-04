use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, create_master_edition_v3,
        CreateMetadataAccountsV3, CreateMasterEditionV3, Metadata,
        mpl_token_metadata::types::{DataV2, Creator},
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("PROD1111111111111111111111111111111111111111");

#[program]
pub mod product_auth {
    use super::*;

    pub fn initialize_auth_system(
        ctx: Context<InitializeAuthSystem>,
        collection_name: String,
        collection_symbol: String,
        collection_uri: String,
    ) -> Result<()> {
        let state = &mut ctx.accounts.auth_state;
        state.authority = ctx.accounts.authority.key();
        state.collection_mint = ctx.accounts.collection_mint.key();
        state.total_products = 0;
        state.verified_products = 0;

        // Create collection NFT
        let seeds = b"collection";
        let bump = ctx.bumps.collection_mint;
        let signer: &[&[&[u8]]] = &[&[seeds, &[bump]]];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    to: ctx.accounts.collection_token_account.to_account_info(),
                    authority: ctx.accounts.collection_mint.to_account_info(),
                },
                signer,
            ),
            1,
        )?;

        let creators = vec![Creator {
            address: ctx.accounts.authority.key(),
            verified: true,
            share: 100,
        }];

        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.collection_metadata.to_account_info(),
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: ctx.accounts.authority.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer,
            ),
            DataV2 {
                name: collection_name,
                symbol: collection_symbol,
                uri: collection_uri,
                seller_fee_basis_points: 0,
                creators: Some(creators),
                collection: None,
                uses: None,
            },
            true,
            true,
            None,
        )?;

        create_master_edition_v3(
            CpiContext::new_with_signer(
                ctx.accounts.metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    edition: ctx.accounts.collection_master_edition.to_account_info(),
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: ctx.accounts.authority.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    payer: ctx.accounts.authority.to_account_info(),
                    metadata: ctx.accounts.collection_metadata.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer,
            ),
            Some(0),
        )?;

        msg!("Product authentication system initialized");
        Ok(())
    }

    pub fn register_product(
        ctx: Context<RegisterProduct>,
        qr_code: String,
        product_id: String,
        product_type: ProductType,
        metadata_uri: String,
    ) -> Result<()> {
        require!(qr_code.len() <= 32, ErrorCode::QRCodeTooLong);
        require!(product_id.len() <= 32, ErrorCode::ProductIdTooLong);

        let product = &mut ctx.accounts.product_record;
        product.qr_code = qr_code;
        product.product_id = product_id;
        product.product_type = product_type;
        product.metadata_uri = metadata_uri;
        product.is_verified = false;
        product.registered_at = Clock::get()?.unix_timestamp;
        product.authority = ctx.accounts.authority.key();

        ctx.accounts.auth_state.total_products += 1;

        msg!("Product registered: {}", product.product_id);
        Ok(())
    }

    pub fn create_auth_nft(
        ctx: Context<CreateAuthNFT>,
        qr_code: String,
    ) -> Result<()> {
        let product = &mut ctx.accounts.product_record;
        require!(product.qr_code == qr_code, ErrorCode::InvalidQRCode);
        require!(!product.is_verified, ErrorCode::AlreadyVerified);

        // Mint authentication NFT
        let seeds = b"auth_nft";
        let bump = ctx.bumps.auth_nft_mint;
        let signer: &[&[&[u8]]] = &[&[seeds, qr_code.as_bytes(), &[bump]]];

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.auth_nft_mint.to_account_info(),
                    to: ctx.accounts.auth_nft_token_account.to_account_info(),
                    authority: ctx.accounts.auth_nft_mint.to_account_info(),
                },
                signer,
            ),
            1,
        )?;

        // Create metadata
        let creators = vec![Creator {
            address: ctx.accounts.auth_state.authority,
            verified: false,
            share: 100,
        }];

        let nft_name = format!("Auth #{}", product.product_id);

        create_metadata_accounts_v3(
            CpiContext::new_with_signer(
                ctx.accounts.metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.auth_nft_metadata.to_account_info(),
                    mint: ctx.accounts.auth_nft_mint.to_account_info(),
                    mint_authority: ctx.accounts.auth_nft_mint.to_account_info(),
                    update_authority: ctx.accounts.auth_state.to_account_info(),
                    payer: ctx.accounts.user.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
                signer,
            ),
            DataV2 {
                name: nft_name,
                symbol: "AUTH".to_string(),
                uri: product.metadata_uri.clone(),
                seller_fee_basis_points: 0,
                creators: Some(creators),
                collection: None,
                uses: None,
            },
            true,
            true,
            None,
        )?;

        product.is_verified = true;
        product.auth_nft_mint = Some(ctx.accounts.auth_nft_mint.key());
        ctx.accounts.auth_state.verified_products += 1;

        msg!("Authentication NFT created for product: {}", product.product_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeAuthSystem<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AuthState::INIT_SPACE,
        seeds = [b"auth_state"],
        bump
    )]
    pub auth_state: Account<'info, AuthState>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = collection_mint,
        seeds = [b"collection"],
        bump
    )]
    pub collection_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = collection_mint,
        associated_token::authority = authority,
    )]
    pub collection_token_account: Account<'info, TokenAccount>,

    /// CHECK: Created by Metaplex
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: Created by Metaplex
    #[account(mut)]
    pub collection_master_edition: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(qr_code: String)]
pub struct RegisterProduct<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProductRecord::INIT_SPACE,
        seeds = [b"product", qr_code.as_bytes()],
        bump
    )]
    pub product_record: Account<'info, ProductRecord>,

    #[account(
        mut,
        seeds = [b"auth_state"],
        bump,
        constraint = auth_state.authority == authority.key() @ ErrorCode::Unauthorized
    )]
    pub auth_state: Account<'info, AuthState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(qr_code: String)]
pub struct CreateAuthNFT<'info> {
    #[account(
        mut,
        seeds = [b"product", qr_code.as_bytes()],
        bump,
        constraint = !product_record.is_verified @ ErrorCode::AlreadyVerified
    )]
    pub product_record: Account<'info, ProductRecord>,

    #[account(
        mut,
        seeds = [b"auth_state"],
        bump
    )]
    pub auth_state: Account<'info, AuthState>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = auth_nft_mint,
        seeds = [b"auth_nft", qr_code.as_bytes()],
        bump
    )]
    pub auth_nft_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        associated_token::mint = auth_nft_mint,
        associated_token::authority = user,
    )]
    pub auth_nft_token_account: Account<'info, TokenAccount>,

    /// CHECK: Created by Metaplex
    #[account(mut)]
    pub auth_nft_metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
#[derive(InitSpace)]
pub struct AuthState {
    pub authority: Pubkey,
    pub collection_mint: Pubkey,
    pub total_products: u64,
    pub verified_products: u64,
}

#[account]
#[derive(InitSpace)]
pub struct ProductRecord {
    #[max_len(32)]
    pub qr_code: String,
    #[max_len(32)]
    pub product_id: String,
    pub product_type: ProductType,
    #[max_len(200)]
    pub metadata_uri: String,
    pub is_verified: bool,
    pub auth_nft_mint: Option<Pubkey>,
    pub registered_at: i64,
    pub authority: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub enum ProductType {
    VapeProduct,
    Supplement,
    Cosmetic,
    Other,
}

#[error_code]
pub enum ErrorCode {
    #[msg("QR code too long")]
    QRCodeTooLong,
    #[msg("Product ID too long")]
    ProductIdTooLong,
    #[msg("Invalid QR code")]
    InvalidQRCode,
    #[msg("Already verified")]
    AlreadyVerified,
    #[msg("Unauthorized")]
    Unauthorized,
}
