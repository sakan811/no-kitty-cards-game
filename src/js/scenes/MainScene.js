import { COLORS, ASSET_KEYS, CARD_DIMENSIONS, ASSIST_CARDS, HAND_CONFIG } from '../config/constants.js';
import { Deck } from '../entities/Deck.js';
import { Hand } from '../entities/Hand.js';
import { Tile } from '../entities/Tile.js';
import { DiscardPile } from '../entities/DiscardPile.js';
import { Card } from '../entities/Card.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.socket = null;
        this.selectedCard = null;
        this.totalPoints = 0;
        this.pointsText = null;
        this.isPlayerTurn = false;
        this.playerId = null;
        this.opponentId = null;
    }

    init(data) {
        console.log('MainScene init with data:', data);
        if (data && data.socket) {
            this.socket = data.socket;
            this.setupSocketListeners();
        } else {
            console.error('No socket provided to MainScene');
        }
    }

    setupSocketListeners() {
        if (!this.socket) {
            console.error('Cannot setup listeners: Socket not initialized');
            return;
        }

        this.socket.on('gameStart', () => {
            console.log('Game starting...');
            this.startGame();
        });

        this.socket.on('gameUpdate', ({ playerId, action, data }) => {
            console.log('Game update:', { playerId, action, data });
            if (playerId !== this.socket.id) {
                this.handleOpponentAction(action, data);
            }
        });

        this.socket.on('playerLeft', () => {
            this.showGameOver('Opponent left the game');
        });
    }

    handleOpponentAction(action, data) {
        switch (action) {
            case 'cardPlayed':
                this.handleOpponentCardPlayed(data);
                break;
            case 'cardDrawn':
                this.handleOpponentCardDrawn();
                break;
            // Add more actions as needed
        }
    }

    handleOpponentCardPlayed(cardData) {
        // Create a sprite for the opponent's played card
        const sprite = this.add.sprite(cardData.x, cardData.y, 'card')
            .setOrigin(0.5)
            .setInteractive();
        
        // Add any additional card properties/animations here
    }

    handleOpponentCardDrawn() {
        // Update opponent's hand visualization
        // Show card draw animation
    }

    createOpponentHand() {
        // Create face-down cards for opponent's hand
        this.opponentCards = [];
        // Position cards at the top of the screen
        // Cards should be face down
    }

    updateOpponentHand(numCards) {
        // Update the number of face-down cards shown for opponent
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
        const handX = centerX - (handWidth / 2);
        const handY = gameHeight - 150;
        this.hand = new Hand(
            this,
            handX,
            handY,
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

        // Create discard pile to the right of the hand
        const discardX = handX + handWidth + CARD_DIMENSIONS.width/2 + 20; // 20px spacing
        this.discardPile = new DiscardPile(
            this,
            discardX,
            handY + CARD_DIMENSIONS.height/2
        );

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
                // Flip both number and assist cards
                card.flip();
            } else {
                card.destroy();
            }
        }
    }

    onTileClick(tile) {
        if (!this.selectedCard) return;

        if (this.selectedCard.type === 'number' && !tile.hasNumber) {
            if (tile.applyCard(this.selectedCard)) {
                // Update total points when a card is successfully applied
                this.totalPoints = this.tiles.reduce((sum, t) => sum + (t.score || 0), 0);
                this.pointsText.setText(`Total Points: ${this.totalPoints}`);
                
                // Move card to discard pile
                const card = this.selectedCard;
                this.hand.removeCard(card);
                this.selectedCard = null;
                this.discardPile.addCard(card);

                // Check if all tiles have numbers (game over condition)
                const allTilesFilled = this.tiles.every(t => t.hasNumber);
                if (allTilesFilled) {
                    this.gameOver();
                }
            }
        } else if (this.selectedCard.type === 'assist') {
            if (this.selectedCard.value === 'bye-bye') {
                this.activateByeByeCard(this.selectedCard);
            } else if (this.selectedCard.value === 'meowster') {
                this.activateMeowsterCard(this.selectedCard);
            }
            // Add other assist card effects here
        }
    }

    onCardClick(card) {
        if (!this.isPlayerTurn) {
            card.deselect();
            card.lower();
            return;
        }

        const cardData = card.getData();
        this.socket.emit('gameAction', {
            action: 'cardPlayed',
            data: {
                type: cardData.type,
                value: cardData.value,
                x: cardData.x || 400,
                y: cardData.y || 300
            }
        });
    }

    activateByeByeCard(card) {
        // Check if there are any number cards placed
        const hasPlacedCards = this.tiles.some(tile => tile.hasNumber);
        if (!hasPlacedCards) {
            this.showWarning('No cards to remove!');
            return;
        }

        // Remove all number cards from tiles
        this.tiles.forEach(tile => {
            if (tile.hasNumber) {
                tile.removeNumber();
            }
        });

        // Update total points
        this.totalPoints = 0;
        this.pointsText.setText('Total Points: 0');

        // Clear card's description and deselect before moving to discard pile
        card.lower();
        card.deselect();

        // Move card to discard pile
        this.hand.removeCard(card);
        this.selectedCard = null;
        this.discardPile.addCard(card);
    }

    activateMeowsterCard(card) {
        // Disable all interactive elements while effect is active
        this.disableAllInteractions();

        // Check if there are any assist cards in the discard pile
        const assistCards = this.discardPile.cards.filter(c => c.type === 'assist');
        if (assistCards.length === 0) {
            this.showWarning('No assist cards in discard pile!');
            // Re-enable interactions
            this.enableAllInteractions();
            return;
        }

        // Clear the description of the Meowster card
        card.lower();
        card.deselect();

        // Create a semi-transparent overlay
        const overlay = this.add.rectangle(
            0, 0,
            this.scale.width,
            this.scale.height,
            0x000000, 0.7
        ).setOrigin(0).setDepth(2000);

        // Create title text
        const titleText = this.add.text(
            this.scale.width/2,
            100,
            'Select an assist card from discard pile',
            {
                fontSize: '32px',
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 20, y: 10 }
            }
        ).setOrigin(0.5).setDepth(2001);

        // Display assist cards from discard pile
        const cardSpacing = CARD_DIMENSIONS.width + 40;
        const startX = this.scale.width/2 - (assistCards.length * cardSpacing)/2 + CARD_DIMENSIONS.width/2;
        
        const cardButtons = assistCards.map((discardedCard, index) => {
            const x = startX + index * cardSpacing;
            const y = this.scale.height/2;

            // Create a container for the card and its elements
            const container = this.add.container(x, y);
            container.setDepth(2002);

            // Add highlight effect
            const highlight = this.add.rectangle(
                0, 0,
                CARD_DIMENSIONS.width + 20,
                CARD_DIMENSIONS.height + 20,
                0xffffff, 0.3
            );

            // Create a new card instance for display
            const displayCard = new Card(this, 0, 0, 'assist', discardedCard.value);
            displayCard.flip();
            
            // Set proper depth for all card elements
            if (displayCard.frontSprite) displayCard.frontSprite.setDepth(2003);
            if (displayCard.text) displayCard.text.setDepth(2004);
            if (displayCard.border) displayCard.border.setDepth(2003);
            
            // Add card description
            const descText = this.add.text(
                0,
                CARD_DIMENSIONS.height/2 + 30,
                ASSIST_CARDS[discardedCard.value].description,
                {
                    fontSize: '16px',
                    color: '#ffffff',
                    backgroundColor: '#000000',
                    padding: { x: 10, y: 5 },
                    align: 'center',
                    wordWrap: { width: CARD_DIMENSIONS.width + 20 }
                }
            ).setOrigin(0.5).setDepth(2004);

            // Add all elements to container
            container.add([highlight, displayCard.frontSprite, displayCard.text]);
            if (displayCard.border) container.add(displayCard.border);
            container.add(descText);

            // Add hitbox on top of everything with highest depth
            const hitArea = this.add.rectangle(
                0, 0,
                CARD_DIMENSIONS.width + 40,
                CARD_DIMENSIONS.height + 60,
                0xffffff, 0
            ).setOrigin(0.5).setDepth(2005);
            container.add(hitArea);

            // Make the hitbox interactive
            hitArea.setInteractive({
                useHandCursor: true
            })
            .on('pointerover', () => {
                highlight.setAlpha(0.5);
            })
            .on('pointerout', () => {
                highlight.setAlpha(0.3);
            })
            .on('pointerdown', async () => {
                // First check if hand has space
                if (this.hand.cards.length >= 10) {
                    this.showWarning('Hand is full!');
                    return;
                }

                // Move Meowster card to discard pile first
                this.hand.removeCard(card);
                this.selectedCard = null;
                this.discardPile.addCard(card);

                // Clean up selection UI
                overlay.destroy();
                titleText.destroy();
                cardButtons.forEach(btn => {
                    btn.container.destroy();
                    btn.displayCard.destroy();
                });
                if (cancelButton?.active) cancelButton.destroy();

                // Create new card at the next available position in hand
                const handPosition = this.hand.getNextCardPosition();
                const newCard = new Card(this, handPosition.x, handPosition.y, 'assist', discardedCard.value);
                this.hand.addCard(newCard);
                await newCard.flip();

                // Re-enable interactions after effect is complete
                this.enableAllInteractions();
            });

            return {
                container,
                displayCard
            };
        });

        // Add cancel button
        const cancelButton = this.add.text(
            this.scale.width/2,
            this.scale.height - 100,
            'Cancel',
            {
                fontSize: '24px',
                color: '#ffffff',
                backgroundColor: '#ff4444',
                padding: { x: 20, y: 10 }
            }
        )
        .setOrigin(0.5)
        .setDepth(2005)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
            cancelButton.setStyle({ backgroundColor: '#ff6666' });
        })
        .on('pointerout', () => {
            cancelButton.setStyle({ backgroundColor: '#ff4444' });
        })
        .on('pointerdown', () => {
            overlay.destroy();
            titleText.destroy();
            cardButtons.forEach(btn => {
                btn.container.destroy();
                btn.displayCard.destroy();
            });
            cancelButton.destroy();

            // Re-enable interactions when cancelled
            this.enableAllInteractions();
        });
    }

    disableAllInteractions() {
        // Disable hand cards
        if (this.hand?.cards) {
            this.hand.cards.forEach(c => {
                c.frontSprite?.removeInteractive();
                c.backSprite?.removeInteractive();
            });
        }

        // Disable decks
        if (this.decks) {
            Object.values(this.decks).forEach(deck => {
                deck.visual?.removeInteractive();
            });
        }

        // Disable tiles
        if (this.tiles) {
            this.tiles.forEach(tile => {
                tile.sprite?.removeInteractive();
            });
        }
    }

    enableAllInteractions() {
        // Re-enable hand cards
        this.hand.cards.forEach(c => {
            c.frontSprite?.setInteractive({ useHandCursor: true });
            c.backSprite?.setInteractive({ useHandCursor: true });
        });

        // Re-enable deck interactions
        Object.values(this.decks).forEach(deck => {
            deck.visual?.setInteractive({ useHandCursor: true });
        });

        // Re-enable tile interactions
        this.tiles.forEach(tile => {
            tile.sprite?.setInteractive({ useHandCursor: true });
        });

        // Re-enable discard pile interactions if any
        if (this.discardPile.visual) {
            this.discardPile.visual.setInteractive({ useHandCursor: true });
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
        this.disableAllInteractions();
        
        // Add game over text in the center of the screen
        const gameOverText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
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

    startTurn() {
        this.isPlayerTurn = true;
        // Enable interactions
        // Show turn indicator
    }

    endTurn() {
        this.isPlayerTurn = false;
        // Disable interactions
        // Update turn indicator
    }

    showGameOver(message) {
        this.disableAllInteractions();
        
        // Add game over text in the center of the screen
        const gameOverText = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            message,
            {
                fontSize: '32px',
                fill: '#000000',
                backgroundColor: '#ffffff',
                padding: { x: 20, y: 10 }
            }
        ).setOrigin(0.5);
    }
} 