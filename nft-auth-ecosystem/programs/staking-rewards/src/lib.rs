use anchor_lang::prelude::*;

declare_id!("GDsfKjwHe3fHiwAGh35wyA4p61d2MibiJ7erEk4pmHHQ");

#[program]
pub mod staking_rewards {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
