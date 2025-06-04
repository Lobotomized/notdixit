const express = require('express');
const { drawRandomCardFromDeck, checkIfAllVoted, checkIfStoryTeller, nextStoryTeller, countPoints, cleanVotesAndActiveStory, checkForWinner, moveCardFromHandToBoard, checkIfPlayerPickedACard, allPlayersPickedACard } = require('./helperMethods');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const newG = require('./globby').newIOServer;
const delayStartBlocker = require('./blockers').delayStartBlocker


app.use('/static', express.static('public'))
const winningPoints = 15;
newG({
    baseState: {
        activeStory:null, // String
        cardsOnBoard:[], // image,id, storyTellerCard, playerRef, []
        players: {}, // {playerRef: {name,points,cardsInHand,storyTeller, vote:cardId}},
        winner: null,
        remainingCards:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,
            32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,
            64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95] // number []
    },
    moveFunction: function (player, move, state) {
        switch (move.type) {
           case 'vote':
               // {type: 'vote', cardId:card.id}
               if(checkIfStoryTeller(player.ref,state) || !state.activeStory) return;
                    state.players[player.ref].vote = move.cardId;
               if(!checkIfAllVoted(state)) return;
                    countPoints(state);
                    cleanVotesAndActiveStory(state);
                    state.winner = checkForWinner(state,winningPoints);
                    nextStoryTeller(state);
               break
            case 'story':
                // {type: 'story', story:story, cardId:card.id} 
                if(!checkIfStoryTeller(player.ref,state)) return;
                if(state.activeStory || !move.cardId) return;
                    state.activeStory = move.story;
                    moveCardFromHandToBoard(state,player.ref,move.cardId, true);   
                    drawRandomCardFromDeck(state,player.ref);
                break
            case 'pickCard':
                    // {type:'pickCard', cardId:card.id}
                    if(checkIfPlayerPickedACard(state,player.ref)) return;
                        moveCardFromHandToBoard(state,player.ref,move.cardId);
                        drawRandomCardFromDeck(state,player.ref);
                break;
            
        }
    },
    minPlayers:4,
    maxPlayers: 4, // Number of Players you want in a single game
    timeFunction: function (state) {

    },
    // startBlockerFunction: delayStartBlocker.startBlockerFunction(1000),
    // joinBlockerFunction: delayStartBlocker.joinBlockerFunction,
    statePresenter: function (state, playerRef) {
        if(allPlayersPickedACard){
            return {
                cardsOnBoard: state.cardsOnBoard,
                activeStory: state.activeStory,
                myCards: state.players[playerRef].cardsInHand,
                me:state.players[playerRef],
                players: Object.values(state.players).map((player) =>{
                    return {
                        name: player.name,
                        points: player.points,
                        storyTeller: player.storyTeller,
                    }
                })
            }
        }
        else{
            return {
                activeStory: state.activeStory,
                me:state.players[playerRef],
                myCards: state.players[playerRef].cardsInHand,
                players: state.players.map((player) =>{
                    return {
                        name: player.name,
                        points: player.points,
                        storyTeller: player.storyTeller,
                    }
                })
            }
        }
    },
    connectFunction: function (state, playerRef) {
        state.players[playerRef] = {
            name: playerRef,
            points: 0,
            cardsInHand:[],
            storyTeller: false
        }
        for(let i = 0; i<=6; i++){
            drawRandomCardFromDeck(state,playerRef)
        }
        if(Object.keys(state.players).length === 4){
            state.players[playerRef].storyTeller = true;
        }
        
    },
    disconnectFunction: function (state, playerRef) {
        //state[playerRef] = undefined;
    }
},
    io)


app.get('/', function (req, res) {
    return res.status(200).sendFile(__dirname + '/exampleBasic.html');
});


http.listen(3000, function () {
    console.log('listening on *:3000');
});