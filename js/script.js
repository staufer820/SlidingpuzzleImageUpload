let canvas = document.querySelector("canvas");
let fileInput = document.getElementById("file");
let sizeSelect = document.getElementById("sizeSelect");
let timeDisplay = document.getElementById("time");
let h2 = document.querySelector("h2.time");

class Game {
    constructor(numberOfCols=0, buffer=new ArrayBuffer()) {
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.numberOfCols = numberOfCols;
        this.fields = [];
        this.emptyField = new Position(numberOfCols-1, numberOfCols-1, canvas.height/numberOfCols, canvas.height/numberOfCols);
        this.ImageBuffer= new Uint8Array(buffer);
        this.time = 0;
        this.gameover = true;
        this.justSetup = true;
        canvas.className = "";
        h2.className = "time"
    }

    toJSON() {
        return {
            numberOfCols: this.numberOfCols,
            fields: this.fields,
            emptyField: this.emptyField,
            time: this.time,
            imageBuffer: this.ImageBuffer,
            gameover: this.gameover
        }
    }

    get timeString() {
        let min = (this.time - (this.time % 60))/60;
        let sec = (this.time) % 60;
        let zeroS = (sec < 10) ? "0" : "";
        let zeroM = (min < 10) ? "0" : "";
        return zeroM + min + ":" + zeroS + sec;
    }

    async loadImage(imageBuffer) {
        this.imageFile= new Blob([imageBuffer])
        this.image = await createImageBitmap(this.imageFile)
    }

    async setup() {
        await this.loadImage(this.ImageBuffer);
        for (let i = 0; i < this.numberOfCols; i++) {
            for (let j = 0; j < this.numberOfCols; j++) {
                if (i < this.numberOfCols-1 || j < this.numberOfCols-1) {
                    let piece = new Piece(j, i, this);
                    this.fields.push(piece);
                }
            }
        }
    }

    randomize() {
        this.justSetup = false;
        this.time = 0;
        for (let i = 0; i < 100*this.numberOfCols; i++) {
            let movable = false;
            let rrow, rcol;
            while (!movable) {
                rcol = Math.floor(Math.random()*this.numberOfCols);
                rrow = Math.floor(Math.random()*this.numberOfCols);
                movable = rcol == this.emptyField.col || rrow == this.emptyField.row;
            }

            this.movePieces({col: rcol, row: rrow});
        }
        this.gameover = false;
    }

    movePieces(position) {
        let movingPieces = [];
        let direction = 0;

        if (this.emptyField.col == position.col) {
            if (this.emptyField.row < position.row) {
                this.fields.forEach(field => {
                    if (field.position.col == position.col && 
                        field.position.row > this.emptyField.row && field.position.row <= position.row) {
                            movingPieces.push(field);
                        }
                });
                direction = 0;
            } else if (this.emptyField.row > position.row) {
                this.fields.forEach(field => {
                    if (field.position.col == position.col && 
                        field.position.row < this.emptyField.row && field.position.row >= position.row) {
                            movingPieces.push(field);
                        }
                });
                direction = 2;
            }
        } else if (this.emptyField.row == position.row) {
            if (this.emptyField.col < position.col) {
                this.fields.forEach(field => {
                    if (field.position.row == position.row && 
                        field.position.col > this.emptyField.col && field.position.col <= position.col) {
                            movingPieces.push(field);
                        }
                });
                direction = 3;
            } else if (this.emptyField.col > position.col) {
                this.fields.forEach(field => {
                    if (field.position.row == position.row && 
                        field.position.col < this.emptyField.col && field.position.col >= position.col) {
                            movingPieces.push(field);
                        }
                });
                direction = 1;
            }
        }
        if ((movingPieces.length > 0)) {
            this.emptyField.row = position.row;
            this.emptyField.col = position.col;
            movingPieces.forEach(mp => {
                mp.move(direction);
            });
        }
        this.checkWin();
    }

    checkWin() {
        let gameover = true;
        this.fields.forEach(f => {
            if (!(f.position.col == f.startingPosition.col && f.position.row == f.startingPosition.row)) {
                gameover = false;
            }
        });

        if (gameover) {
            console.log("gameover");
            this.gameover = true;
            let lastpiece = new Piece(this.numberOfCols-1, this.numberOfCols-1, this);
            lastpiece.draw();
            canvas.className = "win";
            h2.className = "large";
        }
    }

    static async load(json) {
        let game = await JSON.parse(json);
        let loadedGame = new Game()
        loadedGame.ImageBuffer = new Uint32Array(game.imageBuffer);
        await  loadedGame.loadImage(loadedGame.imageBuffer);
        loadedGame.numberOfCols = game.numberOfCols;
        loadedGame.fields = game.fields;
        game.fields.forEach(f => {
            let piece = Object.create(Piece.prototype);
            piece.position = f.position;
            piece.startingPosition = f.startingPosition;
            piece.sourcePosition = f.sourcePosition;
            piece.game = loadedGame;
            piece.draw();

            loadedGame.fields.push(piece);
        });
        loadedGame.emptyField = game.emptyField;

        loadedGame.gameover = game.gameover;
        loadedGame.time = game.time;
        
        console.log(game);
        return loadedGame
    }

    save() {
        let json = JSON.stringify(this);
        console.log(json);
        return json;
    }
}



class Position {
    constructor(col, row, width, height) {
        this.col = col;
        this.row = row;
        this.pieceWidth = width;
        this.pieceHeight = height;
    }
    get x(){
        return this.col*this.pieceWidth
    }
    get y(){
        return this.row*this.pieceHeight
    }

}

class Piece {
    constructor(x, y, game) {
        this.position = new Position(x, y, canvas.width/game.numberOfCols, canvas.height/game.numberOfCols);
        this.sourcePosition = new Position(x, y, game.image.width/game.numberOfCols, game.image.height/game.numberOfCols);
        this.startingPosition = new Position(x, y, canvas.width/game.numberOfCols, canvas.height/game.numberOfCols);
        this.game = game;
        this.draw();
    }

    toJSON() {
        return {
            position: this.position,
            sourcePosition: this.sourcePosition,
            startingPosition: this.startingPosition
        };
    }

    move(dir) {
        if (dir == 0) {
            if (this.position.row > 0) this.position.row--;
        } else if (dir == 1) {
            if (this.position.col < this.game.numberOfCols - 1) this.position.col++;
        } else if (dir == 2) {
            if (this.position.row < this.game.numberOfCols - 1) this.position.row++;
        } else {
            if (this.position.col > 0) this.position.col--;
        }
        this.draw();
    }

    draw() {
        let ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.clearRect(this.game.emptyField.x, this.game.emptyField.y, this.game.emptyField.pieceWidth, this.game.emptyField.pieceHeight);
        ctx.clearRect(this.position.x, this.position.y, this.position.pieceWidth, this.position.pieceHeight);
        ctx.drawImage(this.game.image, this.sourcePosition.x, this.sourcePosition.y, 
            this.sourcePosition.pieceWidth, this.sourcePosition.pieceHeight, this.position.x, this.position.y,
            this.position.pieceWidth, this.position.pieceHeight);
    }
}

let game = null;

fileInput.addEventListener("input", async function (e1) {
 
        let result= await e1.target.files[0].arrayBuffer()
        game = new Game(sizeSelect.value, result, e1.target.files[0]);
        game.setup();


});

let interval;

async function startGame() {
    game.randomize();
    clearInterval(interval);
    interval = setInterval(function () {
        if (!game.gameover) {
            timeDisplay.innerHTML = game.timeString;
            game.time++;
        } else {
            clearInterval(interval);
        }
    }, 1000);
}

canvas.addEventListener("click", function (e) {
    let rect = canvas.getBoundingClientRect();
    if (!game.gameover) {
        let col = Math.floor((e.clientX - rect.left)/(canvas.width/game.numberOfCols));
        let row = Math.floor((e.clientY - rect.top)/(canvas.height/game.numberOfCols));
        game.movePieces({col: col, row: row});
    }
});