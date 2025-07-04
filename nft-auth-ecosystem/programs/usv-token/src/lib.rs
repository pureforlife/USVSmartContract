use anchor_lang::prelude::*;

declare_id!("D6PnWFL4QGJnrqN3vQy8AU9ynVNmhNFLP9QhLT17ad4R");

#[program]
pub mod usv_token {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
