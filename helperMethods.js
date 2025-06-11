const NUMBER_OF_PLAYERS = 3;
function checkIfStoryTeller(playerRef, state) {
  if (state.players[playerRef]?.storyTeller) {
    return true;
  } else {
    return false;
  }
}
function checkIfAllVoted(state) {
  const voters = Object.keys(state.players).filter(
    (playerId) =>
      !state.players[playerId].storyTeller && !state.players[playerId].vote
  );
  return voters.length === 0;
}

/**
 * Counts the points in a Dixit game based on the given state.
 *
 * @param {Object} state The state of the game.
 * @param {Array} state.cardsOnBoard The cards on the board.
 * @param {Object} state.players The players in the game.
 * @returns {Object} The updated state with new points and story teller.
 */
function countPoints(state) {
  // First, find the story teller and the correct card
  let storyTellerId;
  let correctCard;
  for (const playerId in state.players) {
    if (state.players[playerId].storyTeller) {
      storyTellerId = playerId;
      break;
    }
  }
  for (const card of state.cardsOnBoard) {
    if (card.storyTellerCard) {
      correctCard = card;
      break;
    }
  }

  // Initialize a counter for the number of players who guessed correctly
  let correctGuesses = 0;

  // Initialize an object to store the votes for each card
  const cardVotes = {};
  for (const card of state.cardsOnBoard) {
    cardVotes[card.id] = 0;
  }

  // Count the votes for each card and check if the players guessed correctly
  for (const playerId in state.players) {
    if (playerId !== storyTellerId) {
      const votedCardId = state.players[playerId].vote;
      cardVotes[votedCardId]++;
      if (votedCardId === correctCard.id) {
        correctGuesses++;
      }
    }
  }

  // Update the points for the players who guessed correctly
  for (const playerId in state.players) {
    if (
      playerId !== storyTellerId &&
      state.players[playerId].vote === correctCard.id
    ) {
      state.players[playerId].points =
        (state.players[playerId].points || 0) + 3;
    }
  }

  // Update the points for the story teller
  if (
    correctGuesses > 0 &&
    correctGuesses < Object.keys(state.players).length - 1
  ) {
    state.players[storyTellerId].points =
      (state.players[storyTellerId].points || 0) + 3;
  }

  // Update the points for the players who played cards that were voted for
  for (const card of state.cardsOnBoard) {
    if (card.id !== correctCard.id) {
      const votes = cardVotes[card.id];
      if (votes > 0) {
        state.players[card.playerRef].points =
          (state.players[card.playerRef].points || 0) + votes;
      }
    }
  }

  // Make the next player the new story teller
  const playerIds = Object.keys(state.players);
  const currentStoryTellerIndex = playerIds.indexOf(storyTellerId);
  const newStoryTellerIndex = (currentStoryTellerIndex + 1) % playerIds.length;
  const newStoryTellerId = playerIds[newStoryTellerIndex];
  for (const playerId in state.players) {
    state.players[playerId].storyTeller = playerId === newStoryTellerId;
  }

  return state;
}

// function countPoints(state) {
//   const correctCard = state.cardsOnBoard.find((card) => card.storyTellerCard);
//   let guessedCorrectly = 0;
//   let storyTeller = null;
//   Object.keys(state.players).forEach((playerId) => {
//     if (state.players[playerId].vote === correctCard.id) {
//       guessedCorrectly++;
//       state.players[playerId].points += 3;
//     } else if (!state.players[playerId].storyTeller) {
//       state.players[correctCard.playerRef].points += 1;
//     } else {
//       storyTeller = state.players[playerId];
//     }
//   });
//   if (guessedCorrectly > 0 && guessedCorrectly < NUMBER_OF_PLAYERS - 1) {
//     storyTeller.points += 3;
//   }
// }

function cleanVotesAndActiveStory(state) {
  Object.keys(state.players).forEach((playerId) => {
    state.players[playerId].vote = null;
  });
  state.activeStory = null;
  state.cardsOnBoard = [];
}

function checkForWinner(state, winningPoints) {
  return Object.keys(state.players).find(
    (playerId) => state.players[playerId].points >= winningPoints
  );
}

function nextStoryTeller(state) {
  const players = Object.keys(state.players);
  const storyTellerIndex = players.findIndex(
    (playerId) => state.players[playerId].storyTeller
  );
  state.players[players[storyTellerIndex]].storyTeller = false;
  state.players[
    players[(storyTellerIndex + 1) % players.length]
  ].storyTeller = true;
}

function moveCardFromHandToBoard(state, playerRef, cardId, storyTeller) {
  const cardIndex = state.players[playerRef].cardsInHand.findIndex(
    (card) => card.id === cardId
  );

  const theCard = state.players[playerRef].cardsInHand.splice(cardIndex, 1)[0];
  if (storyTeller) {
    theCard.storyTellerCard = true;
  }
  state.cardsOnBoard.push(theCard);
}

function checkIfPlayerPickedACard(state, playerRef) {
  if (state.players[playerRef].storyTeller) {
    return true;
  }
  return state.cardsOnBoard.find((card) => card.playerRef === playerRef);
}

function drawRandomCardFromDeck(state, playerRef) {
  const randomIndex = Math.floor(Math.random() * state.remainingCards.length);
  const cardNumber = state.remainingCards.splice(randomIndex, 1)[0];

  state.players[playerRef].cardsInHand.push({
    id: Math.random().toString(36).substring(2, 15),
    image: cardNumber + ".jpg",
    playerRef: playerRef,
  });
}

function allPlayersPickedACard(state) {
  return state.cardsOnBoard.length === NUMBER_OF_PLAYERS;
}

module.exports = {
  checkIfStoryTeller,
  checkIfAllVoted,
  countPoints,
  NUMBER_OF_PLAYERS,
  cleanVotesAndActiveStory,
  checkForWinner,
  nextStoryTeller,
  moveCardFromHandToBoard,
  checkIfPlayerPickedACard,
  drawRandomCardFromDeck,
  allPlayersPickedACard,
};
