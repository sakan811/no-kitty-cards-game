import { COLORS, ASSET_KEYS, CARD_DIMENSIONS } from '../config/constants.js';
import { Deck } from '../entities/Deck.js';
import { Hand } from '../entities/Hand.js';
import { Tile } from '../entities/Tile.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.selectedCard = null;
        this.totalPoints = 0;
        this.pointsText = null;
    }

    preload() {
        // Load card textures
        this.load.image(ASSET_KEYS.numberCard, 'assets/images/cards/number-card-back.jpeg');
        this.load.image(ASSET_KEYS.assistCard, 'assets/images/cards/assist-card-back.jpeg');
        
        // Load cup textures
        this.load.image(ASSET_KEYS.cupWhite, 'assets/images/cups/cup-white.jpeg');
        this.load.image(ASSET_KEYS.cupPurple, 'assets/images/cups/cup-purple.jpg');
        this.load.image(ASSET_KEYS.cupRed, 'assets/images/cups/cup-red.jpg');
        this.load.image(ASSET_KEYS.cupGreen, 'assets/images/cups/cup-green.jpg');
        this.load.image(ASSET_KEYS.cupBrown, 'assets/images/cups/cup-brown.jpg');
        
        // Create white card front texture
        const cardFront = this.make.graphics();
        cardFront.fillStyle(0xffffff, 1);
        cardFront.fillRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);
        cardFront.lineStyle(2, 0x000000);
        cardFront.strokeRect(0, 0, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);
        cardFront.generateTexture(ASSET_KEYS.cardFront, CARD_DIMENSIONS.width, CARD_DIMENSIONS.height);
        cardFront.destroy();
    }

    create() {
        const gameWidth = this.scale.width;
        const gameHeight = this.scale.height;
        
        // Calculate grid dimensions
        const tileSize = Math.min(gameWidth, gameHeight) * 0.12;
        const tileSpacing = tileSize * 0.15;
        const gridWidth = (tileSize * 3) + (tileSpacing * 2);
        const gridHeight = (tileSize * 3) + (tileSpacing * 2);
        
        // Calculate grid position
        const centerX = gameWidth / 2;
        const centerY = gameHeight / 2;
        const gridStartX = centerX - (gridWidth / 2);
        const gridStartY = centerY - (gridHeight / 2);

        // Create hand
        const handWidth = gameWidth * 0.6;
        this.hand = new Hand(
            this,
            centerX - (handWidth / 2),
            gameHeight - 150,
            handWidth
        );

        // Create decks
        this.deckY = gridStartY + (gridHeight / 2);
        this.decks = {
            number: new Deck(
                this,
                centerX - (gridWidth * 0.8),
                this.deckY,
                'number'
            ),
            assist: new Deck(
                this,
                centerX + (gridWidth * 0.8),
                this.deckY,
                'assist'
            )
        };

        // Setup grid positions
        const positions = [
            // Top row
            { x: gridStartX, y: gridStartY },
            { x: gridStartX + tileSize + tileSpacing, y: gridStartY },
            { x: gridStartX + (tileSize * 2) + (tileSpacing * 2), y: gridStartY },
            
            // Middle row (sides only)
            { x: gridStartX, y: gridStartY + tileSpacing + tileSize },
            { x: gridStartX + (tileSize * 2) + (tileSpacing * 2), y: gridStartY + tileSpacing + tileSize },
            
            // Bottom row
            { x: gridStartX, y: gridStartY + (tileSize * 2) + (tileSpacing * 2) },
            { x: gridStartX + tileSize + tileSpacing, y: gridStartY + (tileSize * 2) + (tileSpacing * 2) },
            { x: gridStartX + (tileSize * 2) + (tileSpacing * 2), y: gridStartY + (tileSize * 2) + (tileSpacing * 2) }
        ];

        // Create tiles
        this.tiles = [];
        const tileIndices = Phaser.Utils.Array.Shuffle([0, 1, 2, 3, 4, 5, 6, 7]);
        const selectedColors = Phaser.Utils.Array.Shuffle([...COLORS.cupColors]).slice(0, 4);
        
        positions.forEach((pos, index) => {
            const hasCup = tileIndices.indexOf(index) < 4;
            const cupColor = hasCup ? selectedColors[tileIndices.indexOf(index)] : ASSET_KEYS.cupWhite;
            
            const tile = new Tile(this, pos.x + (tileSize/2), pos.y + (tileSize/2), tileSize, cupColor);
            this.tiles.push(tile);

            tile.sprite.on('pointerdown', () => this.onTileClick(tile));
        });

        // Setup deck event handlers
        this.decks.number.visual.on('pointerdown', () => this.onDeckClick(this.decks.number));
        this.decks.assist.visual.on('pointerdown', () => this.onDeckClick(this.decks.assist));

        // Add total points display
        this.pointsText = this.add.text(
            this.scale.width - 20,
            20,
            'Total Points: 0',
            {
                fontSize: '24px',
                color: '#000000',
                backgroundColor: '#ffffff',
                padding: { x: 10, y: 5 }
            }
        )
        .setOrigin(1, 0)
        .setDepth(1000);
    }

    onDeckClick(deck) {
        if (this.hand.cards.length >= 10) {
            this.showWarning('Hand is full!');
            return;
        }

        const card = deck.drawCard();
        if (card) {
            const added = this.hand.addCard(card);
            if (added) {
                if (card.type === 'number') {
                    card.flip();
                }
            } else {
                card.destroy();
            }
        }
    }

    onTileClick(tile) {
        if (this.selectedCard && this.selectedCard.type === 'number' && !tile.hasNumber) {
            if (tile.applyCard(this.selectedCard)) {
                // Update total points when a card is successfully applied
                this.totalPoints = this.tiles.reduce((sum, t) => sum + (t.score || 0), 0);
                this.pointsText.setText(`Total Points: ${this.totalPoints}`);
                
                this.hand.removeCard(this.selectedCard);
                this.selectedCard = null;

                // Check if all tiles have numbers (game over condition)
                const allTilesFilled = this.tiles.every(t => t.hasNumber);
                if (allTilesFilled) {
                    this.gameOver();
                }
            }
        }
    }

    onCardClick(card) {
        if (this.selectedCard === card) {
            this.selectedCard = null;
            card.deselect();
            card.lower();
        } else {
            if (this.selectedCard) {
                this.selectedCard.deselect();
                this.selectedCard.lower();
            }
            this.selectedCard = card;
            card.select();
            card.lift();
        }
    }

    showWarning(message) {
        const warningText = this.add.text(
            this.scale.width/2,
            this.scale.height/2,
            message,
            {
                fontSize: '24px',
                color: '#ff0000',
                backgroundColor: '#ffffff',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5);
        
        this.time.delayedCall(1000, () => warningText.destroy());
    }

    gameOver() {
        // Create semi-transparent overlay
        const overlay = this.add.rectangle(
            0, 0,
            this.scale.width,
            this.scale.height,
            0x000000, 0.7
        ).setOrigin(0).setDepth(2000);

        // Create game over text
        const gameOverText = this.add.text(
            this.scale.width/2,
            this.scale.height/2 - 50,
            'Game Over!',
            {
                fontSize: '48px',
                color: '#ffffff',
                fontStyle: 'bold'
            }
        ).setOrigin(0.5).setDepth(2001);

        // Show final score
        const finalScoreText = this.add.text(
            this.scale.width/2,
            this.scale.height/2 + 50,
            `Final Score: ${this.totalPoints}`,
            {
                fontSize: '32px',
                color: '#ffffff'
            }
        ).setOrigin(0.5).setDepth(2001);

        // Add restart button
        const restartButton = this.add.text(
            this.scale.width/2,
            this.scale.height/2 + 150,
            'Play Again',
            {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#4a4a4a',
                padding: { x: 20, y: 10 }
            }
        )
        .setOrigin(0.5)
        .setDepth(2001)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.scene.restart();
        });
    }
} 