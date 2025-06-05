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
const newG = require("./globby").newIOServer;
const delayStartBlocker = require("./blockers").delayStartBlocker;
const stages = {
  wait_for_story: "wait_for_story",
  wait_for_vote: "wait_for_vote",
  pick_card: "pick_card",
};

// Enable CORS for all routes and origins
app.use("/static", express.static("public"));
const winningPoints = 15;
newG(
  {
    baseState: {
      activeStory: null, // String
      cardsOnBoard: [], // image,id, storyTellerCard, playerRef, []
      players: {}, // {playerRef: {name,points,cardsInHand,storyTeller, vote:cardId}},
      winner: null,
      stage: stages.wait_for_story,
      remainingCards: [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
        39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56,
        57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74,
        75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
        93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108,
        109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
        123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136,
        137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150,
        151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164,
        165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178,
        179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192,
        193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206,
        207, 208,
      ], // number []
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
  },
  io
);

app.get("/", function (req, res) {
  return res.status(200).sendFile(__dirname + "/exampleBasic.html");
});

http.listen(3232, function () {
  console.log("listening on *:3232");
});
