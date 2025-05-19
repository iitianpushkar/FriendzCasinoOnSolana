use anchor_lang::prelude::*;
use anchor_lang::solana_program::keccak;
use std::str::FromStr;

// Program ID, replace with your deployed ID
declare_id!("5rFYLcFJRuNgnmYy9GEgXbV4mYw7K7S3SwxTXncc4F1w");

pub const MAX_PLAYERS: usize = 5;
pub const MAX_CELLS: usize = 25;


#[program]
pub mod minesweeper {
    use super::*;

    pub fn create_room(
        ctx: Context<CreateRoom>,
        room_id: String,
        bet_amount: u64,
    ) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(!room.exists, ErrorCode::RoomAlreadyExists);
        require!(bet_amount > 0, ErrorCode::InvalidBetAmount);

        room.leader = ctx.accounts.user.key();
        room.exists = true;
        room.mines = 0;
        room.gems = 0;
        room.bet_amount = bet_amount;
        room.started = false;
        room.mines_revealed = false;
        room.committed_mine_hash = [0u8; 32];
        room.joined = Vec::new();
        room.active = Vec::new();
        room.total_bet = 0;
        room.players = Vec::new();
        room.room_id = room_id.clone();
        room.bump = ctx.bumps.room;

        emit!(RoomCreatedEvent { room_id, leader: room.leader, bet_amount });
        Ok(())
    }

    pub fn join_room(ctx: Context<JoinRoom>) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.exists, ErrorCode::RoomNotFound);
        require!(!room.started, ErrorCode::GameAlreadyStarted);
        require!(room.players.len() < MAX_PLAYERS, ErrorCode::RoomFull);

        let player = ctx.accounts.user.key();
        room.players.push(PlayerState {
            player,
            score: 0,
            clicked: Vec::new(),
            active: false,
        });
        room.joined.push(player);

        emit!(PlayerJoinedEvent { room_id: room.room_id.clone(), player });
        Ok(())
    }

    pub fn bet(ctx: Context<Bet>) -> Result<()> {

        // Cache bet amount and player pubkey
        let amount = ctx.accounts.room.bet_amount;
        let player = ctx.accounts.user.key();

        // Ensure user has enough lamports
        require!(ctx.accounts.user.lamports() >= amount, ErrorCode::InsufficientBet);

        // Perform state validation and mutation in its own scope to release mutable borrow quickly
        {
            let room = &mut ctx.accounts.room;
            require!(room.exists, ErrorCode::RoomNotFound);
            require!(!room.started, ErrorCode::GameAlreadyStarted);

            // Find the player state
            let ps = room.players.iter_mut()
                .find(|ps| ps.player == player)
                .ok_or(ErrorCode::NotInRoom)?;
            require!(!ps.active, ErrorCode::AlreadyBetted);

            // Update on-chain state
            ps.active = true;
            ps.score = 0;
            ps.clicked.clear();
            room.active.push(player);
            room.total_bet = room.total_bet.checked_add(amount).unwrap();
        }

        // Perform lamport transfer via CPI to obey ownership rules
        let cpi_accounts = anchor_lang::system_program::Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.room.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), cpi_accounts);
        anchor_lang::system_program::transfer(cpi_ctx, amount)?;

        emit!(BetEvent { room_id: ctx.accounts.room.room_id.clone(), player });
        Ok(())
    }

    pub fn start_game(
        ctx: Context<StartGame>,
        mines: u8,
        gems: u8,
    ) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.exists, ErrorCode::RoomNotFound);
        require!(ctx.accounts.user.key() == room.leader, ErrorCode::Unauthorized);
        require!(!room.started, ErrorCode::GameAlreadyStarted);
        require!(mines >= 3, ErrorCode::MinMines);
        require!(gems >= 5, ErrorCode::MinGems);
        require!(!room.active.is_empty(), ErrorCode::NoActivePlayers);

        room.mines = mines;
        room.gems = gems;
        room.started = true;
        room.mines_revealed = false;
        room.committed_mine_hash = [0u8; 32];

        for ps in room.players.iter_mut().filter(|ps| ps.active) {
            ps.score = 0;
            ps.clicked.clear();
        }

        emit!(GameStartedEvent { room_id: room.room_id.clone(), leader: room.leader, mines, gems, total_bet: room.total_bet });
        Ok(())
    }

    pub fn commit_mine_hash(
        ctx: Context<CommitMineHash>,
        hash: [u8; 32],
    ) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.exists, ErrorCode::RoomNotFound);
        require!(room.started, ErrorCode::GameNotStarted);
        require!(room.committed_mine_hash == [0u8;32], ErrorCode::AlreadyCommitted);

        let expected = Pubkey::from_str("8y8CfBwhbZe5abSC11QVAtdDraQYHD1hz9QTfLL8VH6b")
        .map_err(|_| error!(ErrorCode::InvalidOwnerPubkey))?;
        require!(ctx.accounts.user.key() == expected, ErrorCode::Unauthorized);

        room.committed_mine_hash = hash;
        emit!(MineHashCommittedEvent { room_id: room.room_id.clone(), committed_hash: hash });
        Ok(())
    }

    pub fn cells_chosen(
        ctx: Context<CellsChosen>,
        choices: Vec<u8>,
    ) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.exists, ErrorCode::RoomNotFound);
        require!(room.started, ErrorCode::GameNotStarted);
        require!(room.committed_mine_hash != [0u8;32], ErrorCode::HashNotCommitted);
        require!(choices.len() == room.gems as usize, ErrorCode::IncorrectGems);

        let player = ctx.accounts.user.key();
        let ps = room.players.iter_mut().find(|ps| ps.player == player).ok_or(ErrorCode::NotInRoom)?;
        require!(ps.active, ErrorCode::MustBet);
        require!(ps.clicked.is_empty(), ErrorCode::AlreadyChosen);

        // validate
        for (i,&c) in choices.iter().enumerate() {
            require!((c as usize) < MAX_CELLS, ErrorCode::InvalidCell);
            for &d in &choices[i+1..] { require!(c!=d, ErrorCode::DuplicateCell); }
        }
        ps.clicked = choices.clone();

        emit!(PlayerCellsEvent { room_id: room.room_id.clone(), player, chosen_cells: choices });
        Ok(())
    }

    pub fn reveal_mines(ctx: Context<RevealMines>) -> Result<()> {
        let room = &ctx.accounts.room;
        require!(room.exists, ErrorCode::RoomNotFound);
        require!(room.started, ErrorCode::GameNotStarted);
        require!(!room.mines_revealed, ErrorCode::AlreadyRevealed);
        require!(ctx.accounts.user.key() == room.leader, ErrorCode::Unauthorized);
        for ps in room.players.iter().filter(|ps| ps.active) {
            require!(ps.clicked.len() == room.gems as usize, ErrorCode::WaitingPlayers);
        }
        emit!(MineRevealEvent { room_id: room.room_id.clone() });
        Ok(())
    }

    pub fn submit_mines(
        ctx: Context<SubmitMines>,
        revealed: Vec<u8>,
    ) -> Result<()> {
        let room = &mut ctx.accounts.room;
        require!(room.exists, ErrorCode::RoomNotFound);
        require!(room.started, ErrorCode::GameNotStarted);
        require!(!room.mines_revealed, ErrorCode::AlreadyRevealed);
        require!((revealed.len()) == room.mines as usize, ErrorCode::WrongMineCount);

        let expected = Pubkey::from_str("8y8CfBwhbZe5abSC11QVAtdDraQYHD1hz9QTfLL8VH6b")
        .map_err(|_| error!(ErrorCode::InvalidOwnerPubkey))?;
        require!(ctx.accounts.user.key() == expected, ErrorCode::Unauthorized);

        for ps in room.players.iter().filter(|ps| ps.active) {
            require!(ps.clicked.len() == room.gems as usize, ErrorCode::WaitingPlayers);
        }

        // cache identifiers to avoid borrow conflicts
        let rid = room.room_id.clone();

        // verify
        let h = keccak::hash(&revealed).to_bytes();
        if h != room.committed_mine_hash {
            emit!(HashMismatchEvent { room_id: rid.clone(), submitted_hash: h, expected_hash: room.committed_mine_hash });
            refund(room, &ctx.remaining_accounts)?;
            reset(room);
            emit!(MinePositionEvent { room_id: rid.clone(), revealed_mines: revealed });
            return Ok(());
        }
        room.mines_revealed = true;

        // score
        for ps in room.players.iter_mut().filter(|ps| ps.active) {
            let safe = ps.clicked.iter().filter(|&&c| !revealed.contains(&c)).count() as u8;
            ps.score = safe;
            emit!(ScoreEvent { room_id: rid.clone(), player: ps.player, score: safe });
        }

        // winners
        let highest = room.players.iter().filter(|ps| ps.active).map(|ps| ps.score).max().unwrap_or(0);
        let winners: Vec<Pubkey> = room.players.iter().filter(|ps| ps.active && ps.score==highest && highest>0).map(|ps| ps.player).collect();

        if highest==0 || winners.is_empty() || winners.len()==room.active.len() {
            refund(room, &ctx.remaining_accounts)?;
        } else {
            let share = room.total_bet / winners.len() as u64;
            payout(room, &ctx.remaining_accounts, &winners, share)?;
        }
        emit!(GameOverEvent { room_id: room.room_id.clone(), winners: winners.clone(), score: highest });
        emit!(MinePositionEvent { room_id: room.room_id.clone(), revealed_mines: revealed });
        reset(room);
        Ok(())
    }
}

// Helpers
fn refund(room: &mut Account<Room>, accounts: &[AccountInfo]) -> Result<()> {
    for acct in accounts.iter() {
        **room.to_account_info().try_borrow_mut_lamports()? -= room.bet_amount;
        **acct.try_borrow_mut_lamports()? += room.bet_amount;
    }
    Ok(())
}

fn payout(room: &mut Account<Room>, accounts: &[AccountInfo], winners: &[Pubkey], share: u64) -> Result<()> {
    for acct in accounts.iter() {
        if winners.contains(acct.key) {
            **room.to_account_info().try_borrow_mut_lamports()? -= share;
            **acct.try_borrow_mut_lamports()? += share;
        }
    }
    Ok(())
}

fn reset(room: &mut Account<Room>) {
    room.started = false;
    room.mines_revealed = false;
    room.committed_mine_hash = [0u8;32];
    room.total_bet = 0;
    room.active.clear();
    room.mines=0;
    room.gems=0;
    for ps in room.players.iter_mut() { ps.active=false; ps.score=0; ps.clicked.clear(); }
}

// Accounts
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct CreateRoom<'info> {
    #[account(
        init,
        payer=user,
        seeds=[b"room", room_id.as_bytes()],
        bump,
        space=8 + Room::LEN + 4 + room_id.len(),
    )]
    pub room: Account<'info, Room>,
    #[account(mut)] pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinRoom<'info> {
    #[account(mut, seeds=[b"room", room.room_id.as_bytes()], bump=room.bump)]
    pub room: Account<'info, Room>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct Bet<'info> {
    #[account(mut, seeds=[b"room", room.room_id.as_bytes()], bump=room.bump)]
    pub room: Account<'info, Room>,
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StartGame<'info> {
    #[account(mut, seeds=[b"room", room.room_id.as_bytes()], bump=room.bump)]
    pub room: Account<'info, Room>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct CommitMineHash<'info> {
    #[account(mut, seeds=[b"room", room.room_id.as_bytes()], bump=room.bump)]
    pub room: Account<'info, Room>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct CellsChosen<'info> {
    #[account(mut, seeds=[b"room", room.room_id.as_bytes()], bump=room.bump)]
    pub room: Account<'info, Room>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevealMines<'info> {
    #[account(seeds=[b"room", room.room_id.as_bytes()], bump=room.bump)]
    pub room: Account<'info, Room>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitMines<'info> {
    #[account(mut, seeds=[b"room", room.room_id.as_bytes()], bump=room.bump)]
    pub room: Account<'info, Room>,
    pub user: Signer<'info>,
}

// Room data
#[account]
pub struct Room {
    pub leader: Pubkey,
    pub exists: bool,
    pub mines: u8,
    pub gems: u8,
    pub bet_amount: u64,
    pub started: bool,
    pub mines_revealed: bool,
    pub committed_mine_hash: [u8;32],
    pub joined: Vec<Pubkey>,
    pub active: Vec<Pubkey>,
    pub total_bet: u64,
    pub players: Vec<PlayerState>,
    pub room_id: String,
    pub bump: u8,
}

impl Room {
    pub const LEN: usize =
        32 + 1 + 1 + 1 + 1 + 8 + 1 + 1 + 32 +
        (4 + MAX_PLAYERS*32) + // joined
        (4 + MAX_PLAYERS*32) + // active
        8 + // total_bet
        (4 + MAX_PLAYERS*PlayerState::LEN) + // players
        4 + 64 + // room_id
        1; // bump
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PlayerState {
    pub player: Pubkey,
    pub score: u8,
    pub clicked: Vec<u8>,
    pub active: bool,
}

impl PlayerState {
    pub const LEN: usize = 32 + 1 + (4+MAX_CELLS) + 1;
}

// Events
#[event]
pub struct RoomCreatedEvent { pub room_id: String, pub leader: Pubkey, pub bet_amount: u64 }
#[event]
pub struct PlayerJoinedEvent { pub room_id: String, pub player: Pubkey }
#[event]
pub struct BetEvent { pub room_id: String, pub player: Pubkey }
#[event]
pub struct GameStartedEvent { pub room_id: String, pub leader: Pubkey, pub mines: u8, pub gems: u8, pub total_bet: u64 }
#[event]
pub struct MineHashCommittedEvent { pub room_id: String, pub committed_hash: [u8;32] }
#[event]
pub struct PlayerCellsEvent { pub room_id: String, pub player: Pubkey, pub chosen_cells: Vec<u8> }
#[event]
pub struct MineRevealEvent { pub room_id: String }
#[event]
pub struct ScoreEvent { pub room_id: String, pub player: Pubkey, pub score: u8 }
#[event]
pub struct HashMismatchEvent { pub room_id: String, pub submitted_hash: [u8;32], pub expected_hash: [u8;32] }
#[event]
pub struct GameOverEvent { pub room_id: String, pub winners: Vec<Pubkey>, pub score: u8 }
#[event]
pub struct MinePositionEvent { pub room_id: String, pub revealed_mines: Vec<u8> }

// Errors
#[error_code]
pub enum ErrorCode {
    RoomAlreadyExists,
    #[msg("Room not found")] RoomNotFound,
    #[msg("Bet amount must be > 0")] InvalidBetAmount,
    #[msg("Room full")] RoomFull,
    #[msg("Game already started")] GameAlreadyStarted,
    #[msg("Not in room")] NotInRoom,
    #[msg("Already betted")] AlreadyBetted,
    #[msg("Unauthorized")] Unauthorized,
    #[msg("Insufficient bet lamports")] InsufficientBet,
    #[msg("Must have >=3 mines")] MinMines,
    #[msg("Must have >=5 gems")] MinGems,
    #[msg("No active players")] NoActivePlayers,
    #[msg("Game not started")] GameNotStarted,
    #[msg("Already committed")] AlreadyCommitted,
    #[msg("Hash not committed")] HashNotCommitted,
    #[msg("Incorrect gems count")] IncorrectGems,
    #[msg("Already chosen cells")] AlreadyChosen,
    #[msg("Invalid cell index")] InvalidCell,
    #[msg("Duplicate cells")] DuplicateCell,
    #[msg("Waiting for other players")] WaitingPlayers,
    #[msg("Already revealed")] AlreadyRevealed,
    #[msg("Wrong mine count")] WrongMineCount,
    #[msg("Must Bet first")] MustBet,
    #[msg("Invalid owner pubkey")] InvalidOwnerPubkey,
}
