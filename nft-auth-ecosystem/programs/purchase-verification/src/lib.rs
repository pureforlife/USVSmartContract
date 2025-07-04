use anchor_lang::prelude::*;

declare_id!("GaEJ97JCkcsE149KuoEMrs59uZ6HxbzRU8S9LtMoRntk");

#[program]
pub mod purchase_verification {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
