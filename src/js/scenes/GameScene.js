// You can write more code here
import { SocketManager } from '../managers/SocketManager.js';
import { UIManager } from '../managers/UIManager.js';
import { BoardManager } from '../managers/BoardManager.js';

/* START OF COMPILED CODE */

class GameScene extends Phaser.Scene {

	constructor() {
		super({
			key: 'GameScene',
			active: false
		});

		/* START-USER-CTR-CODE */
		this.resetScene();
		/* END-USER-CTR-CODE */
	}

	resetScene() {
		this.socket = null;
		this.roomCode = null;
		this.players = null;
		this.currentTurn = null;
		this.isPlayerTurn = false;
		this.playerId = null;
		this.cupPositions = [
			{ x: 219, y: 975 }, // bottom left (0)
			{ x: 445, y: 979 }, // bottom middle (1)
			{ x: 666, y: 981 }, // bottom right (2)
			{ x: 222, y: 730 }, // middle left (3)
			{ x: 666, y: 726 }, // middle right (4)
			{ x: 222, y: 516 }, // top left (5)
			{ x: 440, y: 511 }, // top middle (6)
			{ x: 666, y: 507 }, // top right (7)
			{ x: 440, y: 730 }  // center (8)
		];
		this.isInitialized = false;
		this.boardManager = null;
		this.socketManager = null;
		this.uiManager = null;
	}

	init(data) {
		console.log('GameScene init with data:', data);
		
		// Always reset the scene state first
		this.resetScene();
		
		// Store the initialization data for use in create()
		this.initData = data;
		
		// If no data or invalid data, emit error event
		if (!data || Object.keys(data).length === 0) {
			console.log('No game data provided, emitting error...');
			this.events.emit('gameError', 'No game data provided');
			return;
		}
		
		// Validate game data
		if (!data?.socket || !data?.roomCode || !data?.players || !data?.gameState || !data?.playerId) {
			console.error('Missing required game data:', data);
			this.events.emit('gameError', 'Invalid game data');
			return;
		}

		// Validate tiles data specifically
		if (!data.gameState.tiles || !data.gameState.tiles.tiles) {
			console.error('Missing tiles data in game state');
			this.events.emit('gameError', 'Invalid game state');
			return;
		}

		// Store game data
		this.socket = data.socket;
		this.roomCode = data.roomCode;
		this.players = data.players;
		this.currentTurn = data.currentTurn;
		this.playerId = data.playerId;
		this.isPlayerTurn = this.currentTurn === this.playerId;
		this.gameState = data.gameState; // Store the full game state
		
		// Initialize managers
		this.boardManager = new BoardManager(this);
		this.socketManager = new SocketManager(this);
		this.uiManager = new UIManager(this);

		this.isInitialized = true;
	}

	preload() {
		// Load card back images
		this.load.image('number-card-back', '/assets/images/cards/number-card-back.jpg');
		this.load.image('assist-card-back', '/assets/images/cards/assist-card-back.jpg');
		
		// Load cup images for all possible colors
		['brown', 'green', 'purple', 'red', 'white'].forEach(color => {
			this.load.image(`cup-${color}`, `/assets/images/cups/cup-${color}.jpg`);
		});
	}

	create() {
		if (!this.isInitialized) {
			console.log('Waiting for game data before creating scene...');
			return;
		}

		console.log('Creating game scene with initialized data:', this.gameState);
		
		// Create base layout
		this.editorCreate();

		// Create UI elements
		if (this.uiManager) {
			this.uiManager.createUIElements();
		}
		
		// Setup game event listeners
		this.setupGameListeners();

		// Show welcome message
		this.showGameStartMessage();

		// Emit ready event to server
		if (this.socket && this.roomCode) {
			this.socket.emit('gameSceneReady', this.roomCode);
		}
	}

	shutdown() {
		console.log('GameScene shutting down');
		
		// Clean up managers
		if (this.socketManager) {
			this.socketManager.removeListeners();
		}
		if (this.uiManager) {
			this.uiManager.cleanup();
		}
		if (this.boardManager) {
			this.boardManager.cleanup();
		}

		// Clean up any remaining DOM elements
		const gameElements = document.querySelectorAll('.game-element');
		gameElements.forEach(element => element.remove());

		// Reset scene state
		this.resetScene();
	}

	/** @returns {void} */
	editorCreate() {
		// Skip if not initialized with game data yet
		if (!this.isInitialized || !this.gameState) {
			console.log('Skipping editorCreate until game data is received');
			return;
		}

		// Add card decks
		const numberCard = this.add.image(383, 735, "number-card-back");
		numberCard.scaleX = 0.1571092064666651;
		numberCard.scaleY = 0.1571092064666651;

		const assistCard = this.add.image(496, 734, "assist-card-back");
		assistCard.scaleX = 0.2179062670624429;
		assistCard.scaleY = 0.2179062670624429;

		// Create cups based on server's game state
		if (this.gameState?.tiles?.tiles) {
			console.log('Creating cups with tiles data:', this.gameState.tiles);
			this.cupPositions.forEach((pos, index) => {
				const tileData = this.gameState.tiles.tiles[index];
				// Skip only the middle tile (index 8), create white cups for uncolored positions
				if (index !== 8) { // Only skip middle tile
					const cupColor = tileData?.cupColor || 'white'; // Default to white if no color specified
					const cupKey = `cup-${cupColor}`;
					console.log(`Creating cup at index ${index} with color ${cupColor}`);
					const cup = this.add.image(pos.x, pos.y, cupKey);
					cup.scaleX = 0.1595550664518873;
					cup.scaleY = 0.1595550664518873;
					cup.setData('color', cupColor);
					cup.setData('tileIndex', index);
					cup.setInteractive();
				}
			});
		} else {
			console.error('Invalid tiles data in game state:', this.gameState);
		}

		this.events.emit("scene-awake");
	}

	/* START-USER-CODE */

	setupGameListeners() {
		// Setup UI interaction listeners only
		this.input.on('gameobjectdown', (pointer, gameObject) => {
			if (!this.isPlayerTurn) return;

			if (gameObject.type === 'Card') {
				this.socketManager.emitCardSelect(gameObject);
			} else if (gameObject.type === 'Tile') {
				this.socketManager.emitTileClick(gameObject.tileIndex);
			}
		});
	}

	// Handle game updates from server
	handleGameUpdate(data) {
		console.log('Handling game update:', data);
		
		switch (data.type) {
			case 'cardDraw':
				this.boardManager.handleCardDraw(data.data);
				break;
			case 'cardPlay':
				this.boardManager.handleCardPlay(data.data);
				break;
			case 'turnEnd':
				this.handleTurnUpdate(data.data);
				break;
			case 'gameState':
				this.boardManager.updateGameState(data.gameState);
				break;
		}

		// Update turn state
		if (data.gameState) {
			this.currentTurn = data.gameState.currentPlayer;
			this.isPlayerTurn = this.currentTurn === this.playerId;
			this.uiManager.updateTurnIndicator(this.isPlayerTurn);
		}
	}

	handleTurnUpdate(data) {
		this.currentTurn = data.nextPlayer;
		this.isPlayerTurn = this.currentTurn === this.playerId;
		this.uiManager.updateTurnIndicator(this.isPlayerTurn);
	}

	showGameStartMessage() {
		const message = this.add.text(this.cameras.main.centerX, 100, 'Game Started!', {
			fontSize: '32px',
			fontFamily: 'Arial',
			fill: '#ffffff',
			stroke: '#000000',
			strokeThickness: 4
		}).setOrigin(0.5);

		this.tweens.add({
			targets: message,
			alpha: 0,
			duration: 1000,
			delay: 1000,
			onComplete: () => message.destroy()
		});
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

export default GameScene;

// You can write more code here
