
function checkIfStoryTeller(playerRef, state) {
    if(state.players[playerRef]?.storyTeller){
        return true;
    }else{
        return false;
    }
}

function checkIfAllVoted(state){
    const voters = Object.keys(state.players).filter(
        playerId => !state.players[playerId].storyTeller || !state.players[playerId].vote
    );
    return voters.length === 0;
}

function countPoints(state){
    const correctCard = state.cardsOnBoard.find(
        card => card.storyTellerCard
    );
    let guessedCorrectly = 0;
    let storyTeller = null;
    Object.keys(state.players).forEach(
        playerId => {
            if(state.players[playerId].vote === correctCard.id){
                guessedCorrectly++;
                state.players[playerId].points += 3;
            }
            else if(!state.players[playerId].storyTeller){
                state.players[correctCard.playerRef].points += 1;
            }
            else{
                storyTeller = state.players[playerId]
            }
        }
    );
    if(guessedCorrectly > 0 && guessedCorrectly < 3){
        storyTeller.points += 3;
    }
}

function cleanVotesAndActiveStory(state){
    Object.keys(state.players).forEach(
        playerId => {
            state.players[playerId].vote = null;
        }
    ); 
    state.activeStory = null;
    state.cardsOnBoard = [];
}

function checkForWinner(state, winningPoints){
    return Object.keys(state.players).find(
        playerId => state.players[playerId].points >= winningPoints 
    )
}

function nextStoryTeller(state){
    const players = Object.keys(state.players);
    const storyTellerIndex = players.findIndex(
        playerId => state.players[playerId].storyTeller
    );
    state.players[players[storyTellerIndex]].storyTeller = false;
    state.players[players[(storyTellerIndex + 1) % players.length]].storyTeller = true; 
}


function moveCardFromHandToBoard(state, playerRef, cardId, storyTeller){
    const cardIndex = state.players[playerRef].cardsInHand.findIndex(
        card => card.id === cardId
    ); 

    const theCard = state.players[playerRef].cardsInHand.splice(cardIndex, 1)[0];
    if(storyTeller){
        theCard.storyTellerCard = true;
    }
    state.cardsOnBoard.push(theCard);
}

function checkIfPlayerPickedACard(state, playerRef){
    if(state.players[playerRef].storyTeller){
        return true
    }
    return state.cardsOnBoard.find(
        card => card.playerRef === playerRef
    );
}

function drawRandomCardFromDeck(state, playerRef){
    state.players[playerRef].cardsInHand.push(
        {
            id: Math.random().toString(36).substring(2, 15),
            image:"test",
            playerRef:playerRef
        }
    ); 
}

function allPlayersPickedACard(state){
    return state.cardsOnBoard.length === 4;
}

module.exports = {
    checkIfStoryTeller,
    checkIfAllVoted,
    countPoints,
    cleanVotesAndActiveStory,
    checkForWinner,
    nextStoryTeller,
    moveCardFromHandToBoard,
    checkIfPlayerPickedACard,
    drawRandomCardFromDeck,
    allPlayersPickedACard
}