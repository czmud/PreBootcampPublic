//game play for ninjaman

const worldHeight = 12, worldLength = 28;
const gridToWord = {0: 'wall', 1: 'sushi', 2: 'onigiri', 3: 'blank'};
const wordToGrid = {wall: 0, sushi: 1, onigiri: 2, blank: 3};
const enumTodirection = {0: 'stay', 1: 'left', 2: 'right', 3: 'up', 4: 'down'};
const directionToEnum = {stay: 0, left: 1, right: 2, up: 3, down: 4};
let sushiScore = 0, totalSushi = 0;
let gameEnd = 0;
let player = {left: 1, top: 3, leftPx: 40, topPx: 120, lives: 3, hit: false, hitTimer: 0};
let leftTemp = 1, topTemp =3;
let ghosts = [];
let ghostDelay = 0;
let world = [];
let mapSpaceOrder = [];

//game generation modification parameters
const wallProb = 0.20; //Probability that randomly generated grid spaces are walls
const sushiOnigiriSplit = 0.667 //Percentage of sushi that is onigiri
const totalSushiSpaces = 175;  //max amount of sushi squares that can be generated
const numberOfBranches = 5;
const snakingProb = 0.75; //Probability that new spaces preference a snaking pattern instead of clumping

let gameTimer = 0; //timer to limit game from looping forever (deciseconds)
const gameTimeLimit = 50000; //game time limit (deciseconds)

//call functions for setting up the game
world = generateWorldGrid();
populateGridWithSushiSpaces(world);
generateGhosts();

//execute game play
gameLoop();

function generateWorldGrid(){
    let genWorld = [], genRow = [];
    for(let y=0; y<worldHeight; y++){
        genRow = [];
        for(let x=0; x<worldLength; x++){
            genRow.push(wordToGrid.wall);
        }
        genWorld.push(genRow);
    }
    return genWorld;
}

function populateGridWithSushiSpaces(worldFx){
    let coordFx = {top: 3, left: 1}, nextSushiSpace = 0, branchCount = 0;
    worldFx[coordFx.top][coordFx.left] = wordToGrid.sushi; //Set map generation 'nucleation' point. For now always start ninjaman in this space
    mapSpaceOrder.push({top: coordFx.top, left: coordFx.left});
    for(let z = 0; z<totalSushiSpaces; z++){
        nextSushiSpace = returnAGoodSpace(coordFx.top, coordFx.left, nextSushiSpace);
        if (nextSushiSpace === 0){
            if(branchCount < numberOfBranches){
                for(w=0; w<mapSpaceOrder.length; w++){//time to back up 'n branch
                    coordFx = mapSpaceOrder.pop();
                    nextSushiSpace = returnAGoodSpace(coordFx.top, coordFx.left, nextSushiSpace);
                    if(nextSushiSpace !== 0){
                        coordFx = movementMapping(coordFx.top, coordFx.left, nextSushiSpace);
                        worldFx[coordFx.top][coordFx.left] = wordToGrid.sushi;
                        mapSpaceOrder.push({top: coordFx.top, left: coordFx.left});
                        branchCount++;
                                break;
                    }
                }
            }else{
                break;
            }
        }else{
            coordFx = movementMapping(coordFx.top, coordFx.left, nextSushiSpace);
            worldFx[coordFx.top][coordFx.left] = wordToGrid.sushi;
            mapSpaceOrder.push({top: coordFx.top, left: coordFx.left});
        }
    }

    for (let y=0; y<worldHeight; y++){ //making random mix of onigiri and sushi
        for(let x=0; x<worldLength; x++){
            if(world[y][x] === 1){
                if(Math.random() < sushiOnigiriSplit){
                    world[y][x] = wordToGrid.onigiri;
                }
            }
        }
    }

    world[3][1] = wordToGrid.blank;

    for(let y=0; y<worldHeight; y++){//count total number of sushi in game
        for(let x=0; x<worldLength; x++){
            if(world[y][x] === 1 || world[y][x] === 2){
                totalSushi++;
            }
        }
    }
}

function returnAGoodSpace(topFx, leftFx, nextSushiSpace){
    let goodSpaceExists = false;
    for(let z = 1; z<=4; z++){
        if(!isAnEdge(topFx, leftFx, z)
        && isSquareAWall(topFx, leftFx, z)){
            goodSpaceExists = true;
        }
    }
    if(goodSpaceExists){
        nextSushiSpace = Math.ceil(Math.random()*4);
        if(isAnEdge(topFx, leftFx, nextSushiSpace)
        || !isSquareAWall(topFx, leftFx, nextSushiSpace)){
            returnAGoodSpace(topFx, leftFx, nextSushiSpace);
        }else{
            return nextSushiSpace;
        }
    }else{
        return 0;
    }
}

//FUNCTION STILL IN PROGRESS - NOT IMPLEMENTED YET
function sushiGenProbTrue(topFx, leftFx, nextSushiSpace){ //returns true for sushi space generation based on probability rules 
    //the higher the number, the more likely a sushi space is to be generated
    //genProb = 0.3*(number of adjacent wall squares) - 0.1*(edge pieces)
    let genProb = 0;
    let coordFx = movementMapping(topFx, leftFx, nextSushiSpace);
    for(let z = 1; z<=4; z++){
        if(isAnEdge(coordFx.top, coordFx.left, z)){
            genProb-= 0.1;
        }else if(isSquareAWall(coordFx.top, coordFx.left, z)){
            genProb+= 0.3;
        }else{
            genProb+= 0.2;
        }
    }
    if(Math.random() < genProb){
        return true;
    }else{
        return false;
    }
}

function generateGhosts(){
    let ghostLeft = 0, ghostTop = 0;
    let ghostLeftPx = 0, ghostTopPx = 0;
    for( let x=0; x<5;x++){
        ghostLeft = 0;
        ghostTop = 0;
        while(world[ghostTop][ghostLeft] === 0){
            ghostLeft = Math.ceil(Math.random()*(worldLength-2)); 
            ghostTop = Math.ceil(Math.random()*(worldHeight-2));
            if(ghostLeft<5 && ghostTop <7){ //ensure ghosts aren't too close to ninjaMan when game starts
                ghostLeft = 0;
                ghostTop = 0;
            }
        }
        ghostEntry = {ghostID: "ghost"+String(x+1), left: ghostLeft, top: ghostTop, leftPx: ghostLeftPx, topPx: ghostTopPx};
        ghosts.push(ghostEntry);
    }
}

function drawWorld(){
    let content = "";
    for (let j = 0; j<world.length; j++){
        content += "<div class='row'>";
            for (let x = 0; x<world[j].length; x++){
                content += "<div class="+gridToWord[world[j][x]]+"></div>";
            }
        content += "</div>";
    }
    document.getElementById('world').innerHTML = content;
}

function drawScore(scoreFx, totalFx, ninjaFx){
    document.getElementById("scoreBoard").innerHTML = "Lives: "+ninjaFx.lives+"&nbsp;&nbsp;&nbsp;Score: "+scoreFx+"/"+totalFx;
    document.getElementById("scoreBoard").innerHTML += "<div style ='background-color: black; position: absolute; left: 360px; top: 4px; width: "+String(totalFx+8)+"px; height: 32px'></div>";
    document.getElementById("scoreBoard").innerHTML += "<div style ='background-color: magenta; position: absolute; left: 364px; top: 8px; width: "+scoreFx+"px; height: 24px'></div>";
}

function drawGhosts(badGhosts){
    content = "";
    for(let x=0; x<badGhosts.length; x++){
        badGhosts[x].leftPx = badGhosts[x].left * 40;
        badGhosts[x].topPx = badGhosts[x].top * 40;
        content += "<div id='"+badGhosts[x].ghostID+"' style='left: "+badGhosts[x].leftPx+"px; top: "+badGhosts[x].topPx+"px'></div>";
    }
    document.getElementById('ghosts').innerHTML = content;
}

function moveGhosts(ghostFx, ninjaFx){
    let ghostRandomMovement = 0;
    ghostDelay++;
    if(ghostDelay === 4){//delay implemented so ghosts can only move every 0.4 seconds
        ghostDelay = 0;
        for(let x=0; x<ghostFx.length; x++){
            ghostRandomMovement = Math.floor(Math.random()*2);
            moveOptions = [];
            if(ghostFx[x].left === ninjaFx.left){// move vertically if ghost has line of sight to ninjaman
                if(ghostFx[x].top < ninjaFx.top){ //down
                    tempMove = movementMapping(ghostFx[x].top, ghostFx[x].left, directionToEnum.down)
                    if(world[tempMove.top][tempMove.left] > 0){
                        ghostFx[x].top = tempMove.top;
                    }
                }else if(ghostFx[x].top > ninjaFx.top){ //up
                    tempMove = movementMapping(ghostFx[x].top, ghostFx[x].left, directionToEnum.up)
                    if(world[tempMove.top][tempMove.left] > 0){
                        ghostFx[x].top = tempMove.top;
                    }
                }
            }else if(ghostFx[x].top === ninjaFx.top){// move horizontally if ghost has line of sight to ninjaman
                if(ghostFx[x].left < ninjaFx.left){ //right
                    tempMove = movementMapping(ghostFx[x].top, ghostFx[x].left, directionToEnum.right)
                    if(world[tempMove.top][tempMove.left] > 0){
                        ghostFx[x].left = tempMove.left;
                    }
                }else if(ghostFx[x].left > ninjaFx.left){ //left
                    tempMove = movementMapping(ghostFx[x].top, ghostFx[x].left, directionToEnum.left)
                    if(world[tempMove.top][tempMove.left] > 0){
                        ghostFx[x].left = tempMove.left;
                    }
                }
            }else if(ghostRandomMovement === 1){
                for(let y=1; y<5; y++){
                    tempMove = movementMapping(ghostFx[x].top, ghostFx[x].left, y);
                    if(world[tempMove.top][tempMove.left] > 0){
                        moveOptions.push(y);
                    }
                    if(moveOptions.length < 1){
                        moveEnum = directionToEnum.stay;
                    }else{
                        moveEnum = moveOptions[Math.floor(Math.random()*moveOptions.length)];
                    }
                }
                tempMove = movementMapping(ghostFx[x].top, ghostFx[x].left, moveEnum);
                ghostFx[x].left = tempMove.left;
                ghostFx[x].top = tempMove.top;
            }
        }
    }
}

function movementMapping(topFx, leftFx, enumerationFx){// function to convert movement direction enumeration into world coordinates
    switch(enumerationFx){
        case 0: // no movement
            leftOutput = leftFx;
            topOutput = topFx;
            break;
        case 1: //left
            leftOutput = leftFx -1;
            topOutput = topFx;
            break;
        case 2: //right
            leftOutput = leftFx +1;
            topOutput = topFx;
            break;
        case 3: //up
            leftOutput = leftFx;
            topOutput = topFx -1;
            break;
        case 4: //down
            leftOutput = leftFx;
            topOutput = topFx +1;
            break;
    }
    return {top: topOutput, left: leftOutput};
}

function isSquareAWall(topFx, leftFx, enumerationFx){//returns true if coordinates contain a wall space OR if the space being moved to contains a wall
    if(enumerationFx === undefined){ //enumeration is optional. if no enumerationFx not given assume no movement happens
        enumerationFx = 0;
    }
    let coordFx = movementMapping(topFx, leftFx, enumerationFx);
    if(world[coordFx.top][coordFx.left]==0){
        return true;
    }else{
        return false;
    }
}

function isAnEdge(topFx, leftFx, enumerationFx){
    if(enumerationFx === undefined){ //enumeration is optional. if no enumerationFx not given assume no movement happens
        enumerationFx = 0;
    }
    let coordFx = movementMapping(topFx, leftFx, enumerationFx);

    if(coordFx.top === 0 //top edge
    || coordFx.top === worldHeight-1 //bottom edge
    || coordFx.left === 0 //left edge
    || coordFx.left === worldLength-1 ){ //right edge
        return true;
    } else {
        return false;
    }
}

function checkGhostAttack(ghostFx, playerFx){
    if(playerFx.hit){
        playerFx.hitTimer+= 1;
        if(playerFx.hitTimer > 20){
            playerFx.hit = false;
            playerFx.hitTimer = 0;
        }
    }else{
        for (let x=0; x<ghostFx.length; x++){
            if(ghostFx[x].left === playerFx.left && ghostFx[x].top === playerFx.top){
                playerFx.lives --;
                playerFx.hit = true;
                if(playerFx.lives < 1){
                    gameEnd = 1;
                }
            }
        }
    }
}

function drawNinjaMan(){
    document.getElementById("ninjaman").style.left = player.leftPx+"px";
    document.getElementById("ninjaman").style.top = player.topPx+"px";
}

document.onkeydown = function(e){  //lets player use either arrow keys or WASD for moving ninjaman
    if(e.keyCode == 37 || e.keyCode == 65) { // LEFT
        leftTemp = player.left - 1;
    }else if (e.keyCode == 39 || e.keyCode == 68) { // RIGHT
        leftTemp = player.left + 1;
    }else if (e.keyCode == 40 || e.keyCode == 83) { // DOWN
		topTemp = player.top + 1;
    }else if (e.keyCode == 38 || e.keyCode == 87) { // UP
		topTemp = player.top - 1;
	}
    if(world[topTemp][leftTemp] > 0){
        player.top = topTemp;
        player.topPx = player.top*40;
        player.left = leftTemp;
        player.leftPx = player.left*40;
        if(world[topTemp][leftTemp] === 1 || world[topTemp][leftTemp] === 2){
            sushiScore++;
            if (sushiScore >= totalSushi){
                gameEnd = 2;
            }
            world[topTemp][leftTemp] = wordToGrid.blank;
        }
    }else{
        topTemp = player.top;
        leftTemp = player.left;
    }
}

function gameLoop(){//heartbeat of the game. executes all the game play functions
    if(gameTimer > 10){
        moveGhosts(ghosts, player);
    }
    checkGhostAttack(ghosts, player);
    drawWorld();
    drawScore(sushiScore, totalSushi, player);
    drawNinjaMan();
    drawGhosts(ghosts);
    

    gameTimer++;
    if( gameTimer > gameTimeLimit || gameEnd > 0){ // end game if any conditions are met.
        if(gameEnd === 1){
            document.getElementById("bannerHolder").innerHTML += "<div id='banner' style='border-color: red; background-color: #fda5b4'><b>GAME OVER</b>"+
                "<br>You were killed by ghosts.<br><i>Refresh page to play again</i></div>";
        }else if(gameEnd === 2){
            document.getElementById("bannerHolder").innerHTML += "<div id='banner' style='border-color: green; background-color: #cceecc'><b>YOU WIN!</b>"+
                "<br>"+sushiScore+" sushi collected!<br><i>Refresh page to play again</i></div>";
        }
        return;
    }
    setTimeout(gameLoop, 100);
}