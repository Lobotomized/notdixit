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

// Enable CORS for all routes and origins
app.use("/static", express.static("public"));
const winningPoints = 15;
newG({
  properties: {
    baseState: {
      activeStory: null, // String
      cardsOnBoard: [], // image,id, storyTellerCard, playerRef, []
      players: {}, // {playerRef: {name,points,cardsInHand,storyTeller, vote:cardId}},
      winner: null,
      stage: stages.wait_for_story,
      remainingCards: Array.from({ length: 850 }, (_, i) => i + 1), // number []
    },
    moveFunction: function (player, move, state) {
      switch (move.type) {
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
    minPlayers: NUMBER_OF_PLAYERS,
    maxPlayers: NUMBER_OF_PLAYERS, // Number of Players you want in a single game
    timeFunction: function (state) {},
    // startBlockerFunction: delayStartBlocker.startBlockerFunction(1000),
    // joinBlockerFunction: delayStartBlocker.joinBlockerFunction,
    statePresenter: function (state, playerRef) {
      if (allPlayersPickedACard) {
        return {
          cardsOnBoard: state.cardsOnBoard,
          activeStory: state.activeStory,
          myCards: state.players[playerRef].cardsInHand,
          me: state.players[playerRef],
          stage: state.stage,
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
          me: state.players[playerRef],
          myCards: state.players[playerRef].cardsInHand,
          stage: state.stage,
          players: state.players.map((player) => {
            return {
              name: player.name,
              points: player.points,
              storyTeller: player.storyTeller,
            };
          }),
        };
      }
    },
    connectFunction: function (state, playerRef) {
      state.players[playerRef] = {
        name: playerRef,
        points: 0,
        cardsInHand: [],
        storyTeller: false,
      };
      for (let i = 0; i <= 6; i++) {
        drawRandomCardFromDeck(state, playerRef);
      }
      if (Object.keys(state.players).length === NUMBER_OF_PLAYERS) {
        state.players[playerRef].storyTeller = true;
      }
    },
    disconnectFunction: function (state, playerRef) {
      //state[playerRef] = undefined;
    },
    rooms: true,
    delay: 500,
  },
  io: io,
  rooms: true,
});

app.get("/", function (req, res) {
  return res.status(200).sendFile(__dirname + "/exampleBasic.html");
});

http.listen(3232, function () {
  console.log("listening on *:3232");
});
