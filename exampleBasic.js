const express = require("express");
const cors = require("cors");
const {
  drawRandomCardFromDeck,
  checkIfAllVoted,
  checkIfStoryTeller,
  nextStoryTeller,
  countPoints,
  cleanVotesAndActiveStory,
  checkForWinner,
  moveCardFromHandToBoard,
  checkIfPlayerPickedACard,
  allPlayersPickedACard,
  NUMBER_OF_PLAYERS,
} = require("./helperMethods");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
  transports: ["websocket", "polling"],
  cors: {
    origin: "*",
    withCredentials: false,
  },
});
const newG = require("./globby").newIOServerV2;

app.use(cors());

const delayStartBlocker = require("./blockers").delayStartBlocker;

const stages = {
  wait_for_story: "wait_for_story",
  wait_for_vote: "wait_for_vote",
  pick_card: "pick_card",
};

app.use("/static", express.static("public"));
const winningPoints = 15;
const lobby = newG({
  properties: {
    baseState: {
      storyTellerTurn:0,
      activeStory: null, // String
      cardsOnBoard: [], // image,id, storyTellerCard, playerRef, []
      players: {}, // {playerRef: {name,points,cardsInHand,storyTeller, vote:cardId}},
      winner: null,
      stage: stages.wait_for_story,
      remainingCards: Array.from({ length: 266 }, (_, i) => i + 1), // number []
      messages:[] // {name:player.name, message:message}
    },
    moveFunction: function (player, move, state) {
      console.log(player, move)
      switch (move.type) {
        case "message":
            state.messages.push({name:state.players[player.ref].name, message:move.message});
          break;
        case "naming":
          if(state.players[player.ref]) state.players[player.ref].name = move.name; 
          break;
        case "vote":
          // {type: 'vote', cardId:card.id}
          if (checkIfStoryTeller(player.ref, state) || !state.activeStory)
            return;
          state.players[player.ref].vote = move.cardId;
          if (!checkIfAllVoted(state)) return;
          countPoints(state);
          cleanVotesAndActiveStory(state);
          state.winner = checkForWinner(state, winningPoints);
          nextStoryTeller(state);
          state.stage = stages.wait_for_story;
          break;
        case "story":
          // {type: 'story', story:story, cardId:card.id}
          if (!checkIfStoryTeller(player.ref, state)) return;
          if (state.activeStory || !move.cardId) return;
          state.activeStory = move.story;
          moveCardFromHandToBoard(state, player.ref, move.cardId, true);
          drawRandomCardFromDeck(state, player.ref);
          state.stage = stages.pick_card;
          break;
        case "pickCard":
          // {type:'pickCard', cardId:card.id}
          if (checkIfPlayerPickedACard(state, player.ref)) return;
          moveCardFromHandToBoard(state, player.ref, move.cardId);
          drawRandomCardFromDeck(state, player.ref);
          if (allPlayersPickedACard(state)) {
            state.stage = stages.wait_for_vote;
          }
          break;
      }
    },
    // minPlayers: NUMBER_OF_PLAYERS, // Number of Players you want in a single game
    // maxPlayers: NUMBER_OF_PLAYERS, // Number of Players you want in a single game
    timeFunction: function (state) {},
    startBlockerFunction: function (
      minPlayers,
      maxPlayers,
      currentPlayers,
      state
    ) {
      //Nqma custom minPlayers ot suzdatelq
      if (state.started) {
        return;
      } else if (
        !state.started &&
        currentPlayers.length == parseInt(state.numberOfPlayers)
      ) {
        state.started = true;
      } else {
        return {
          message: "Not Enough Players To Start",
          required: state.numberOfPlayers,
          current: currentPlayers.length,
        };
      }
    },

    statePresenter: function (state, playerRef) {
      // Check if player reference is valid (between player1 and state.numberOfPlayers)
      let isValidPlayer = false;
      for (let i = 1; i <= parseInt(state.numberOfPlayers); i++) {
        if (playerRef === `player${i}`) {
          isValidPlayer = true;
          break;
        }
      }

      if (!isValidPlayer) {
        return {
          cardsOnBoard: state.cardsOnBoard,
          activeStory: state.activeStory,
        };
      }
      if (allPlayersPickedACard(state)) {
        return {
          cardsOnBoard: state.cardsOnBoard,
          activeStory: state.activeStory,
          myCards: state.players[playerRef].cardsInHand,
          me: state.players[playerRef],
          stage: state.stage,
          messages:state.messages,
          players: Object.values(state.players).map((player) => {
            return {
              name: player.name,
              points: player.points,
              storyTeller: player.storyTeller,
            };
          }),
        };
      } else {
        return {
          activeStory: state.activeStory,
          cardIPlayed: state.cardsOnBoard.find((card) => {
            return card.playerRef === playerRef
          }),
          me: state.players[playerRef],
          myCards: state.players[playerRef].cardsInHand,
          stage: state.stage,
          messages:state.messages,
          players: Object.values(state.players).map((player) => {
            return {
              name: player.name,
              points: player.points,
              storyTeller: player.storyTeller,
            };
          }),
        };
      }
    },
    connectFunction: function (state, playerRef, gameData, playerId) {
      state.numberOfPlayers = gameData.numberOfPlayers;
      if (Object.keys(state.players).length < parseInt(state.numberOfPlayers)) {
        state.players[playerRef] = {
          name: gameData.name ? gameData.name : playerId,
          points: 0,
          cardsInHand: [],
          storyTeller: false,
        };
        for (let i = 0; i <= 6; i++) {
          drawRandomCardFromDeck(state, playerRef);
        }
      }

      if (Object.keys(state.players).length === 1) {
        state.players[playerRef].storyTeller = true;
      }
       console.log('connect ' , state[playerRef] )
    },
    disconnectFunction: function (state, playerRef) {
      console.log('disconnect ' , state[playerRef] )
      state[playerRef] = undefined;
    },
    rooms: true,
    delay: 500,
    hello: true,
  },
  io: io,
  rooms: true,
});

app.get("/", function (req, res) {
  return res.status(200).sendFile(__dirname + "/exampleBasic.html");
});
app.get("/games", function(req,res) {
  return res.json({
    rooms:lobby.games
  })
})

http.listen(8080, function () {
  console.log("listening on *:8080");
});
